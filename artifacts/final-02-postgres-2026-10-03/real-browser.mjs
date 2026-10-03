import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile,stat } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

export async function realBrowser({origin,output,runtimeLegacy}) {
  const directory=path.resolve('dist'),trace=[],pageErrors=[]
  const server=createServer(async(req,res)=>{
    const requestUrl=new URL(req.url,'http://127.0.0.1')
    if(requestUrl.pathname.startsWith('/api')) {
      try {
        assert.equal(req.method,'GET')
        const response=await fetch(origin+requestUrl.pathname+requestUrl.search)
        trace.push({method:req.method,path:requestUrl.pathname,target:origin,status:response.status,mode:'REAL API proxy (no mocked response)'})
        res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/json'})
        res.end(Buffer.from(await response.arrayBuffer()))
      }catch(error){res.writeHead(500);res.end(error.message)}
      return
    }
    let file=path.resolve(directory,'.'+requestUrl.pathname)
    if(!file.startsWith(directory+path.sep)&&file!==directory){res.writeHead(403);res.end();return}
    try{if(!(await stat(file)).isFile())file=path.join(directory,'index.html')}catch{file=path.join(directory,'index.html')}
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'}
    try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file))}catch{res.writeHead(404);res.end()}
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const publicOrigin=`http://127.0.0.1:${server.address().port}`
  const browser=await chromium.launch({headless:true})
  try {
    const context=await browser.newContext({viewport:{width:1280,height:900}})
    await context.addInitScript(()=>localStorage.setItem('ltv-language','vi'))
    await context.route('**/*',route=>new URL(route.request().url()).origin===publicOrigin?route.continue():route.abort())
    const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>pageErrors.push(error.message))
    await page.goto(publicOrigin+'/tin-tuc/'+runtimeLegacy.slug,{waitUntil:'networkidle'})
    await page.locator('.article-header h1').waitFor()
    assert.equal(await page.locator('.article-header h1').textContent(),runtimeLegacy.title)
    assert.equal((await page.locator('.article-location').textContent()).trim(),runtimeLegacy.location)
    assert.ok((await page.locator('.article-header').textContent()).includes(runtimeLegacy.short_description))
    assert.ok((await page.locator('.article-body').textContent()).includes('FINAL02 Legacy Runtime Body'))
    await page.screenshot({path:path.join(output,'real-legacy-vi.png')})
    await page.locator('.language-switch').getByRole('button',{name:'EN',exact:true}).click()
    await page.getByRole('heading',{name:'This article is currently available in Vietnamese only.'}).waitFor()
    assert.equal(await page.locator('html').getAttribute('lang'),'en')
    assert.equal(await page.locator('.article-body').count(),0)
    assert.equal((await page.locator('body').textContent()).includes(runtimeLegacy.location),false)
    await page.screenshot({path:path.join(output,'real-legacy-en-unavailable.png')})
    await page.getByRole('button',{name:'Xem bản Tiếng Việt',exact:true}).click()
    await page.locator('.article-location').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'vi')
    assert.equal(new URL(page.url()).pathname,'/tin-tuc/'+runtimeLegacy.slug)
    assert.equal((await page.locator('.article-location').textContent()).trim(),runtimeLegacy.location)
    await page.goto(publicOrigin+'/tin-tuc/final02-bilingual-vi-updated',{waitUntil:'networkidle'})
    await page.locator('.article-body').waitFor()
    const sequence=()=>page.locator('.article-body').evaluate(element=>Array.from(element.children).map(child=>child.tagName))
    const viSequence=await sequence();assert.deepEqual(viSequence,['H2','P','FIGURE','P','BLOCKQUOTE'])
    const before=page.url()
    await page.locator('.language-switch').getByRole('button',{name:'EN',exact:true}).click()
    await page.waitForURL('**/tin-tuc/final02-bilingual-en-updated')
    assert.equal(await page.locator('.article-header h1').textContent(),'FINAL02 Updated English')
    const enSequence=await sequence();assert.deepEqual(enSequence,['P','UL','H2'])
    const english=page.url()
    await page.locator('.language-switch').getByRole('button',{name:'VI',exact:true}).click()
    await page.waitForURL('**/tin-tuc/final02-bilingual-vi-updated')
    assert.equal(await page.locator('.article-header h1').textContent(),'FINAL02 Updated Vietnamese')
    assert.deepEqual(await sequence(),viSequence)
    assert.deepEqual(pageErrors,[]);assert.ok(trace.some(request=>request.path==='/api/news-events'))
    await context.close()
    return {persistence:'REAL Nest API/Drizzle/PostgreSQL, production public bundle; HTTP proxy only, no API fixture fulfillment',legacyVi:true,legacyEnUnavailable:true,viewVietnameseVersion:true,
      viSequence,enSequence,switchURLs:[before,english,page.url()],trace,pageErrors}
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
