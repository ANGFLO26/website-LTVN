import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

// Serve the public build and intercept all API calls. Never contact a real API/database.
const dist = path.resolve('dist')
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const server = createServer(async (req, res) => {
  let file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname)
  if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403); res.end(); return }
  try { if (!(await stat(file)).isFile()) file = path.join(dist, 'index.html') }
  catch { file = path.join(dist, 'index.html') }
  try {
    res.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream')
    res.end(await readFile(file))
  } catch { res.writeHead(404); res.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })

let mockParagraphs = []
const pageErrors = []

function createCaseStudyItem(paragraphs) {
  const contentObj = {
    version: 1,
    blocks: paragraphs.map((text) => ({
      type: 'paragraph',
      data: { text },
    })),
  }
  return [
    {
      id: 'case-study-id-001',
      slug: 'hoi-thao-van-an-toan',
      type: 'event',
      title: 'Hội Thảo Kỹ Thuật Van An Toàn',
      shortDescription: 'Tối ưu hóa hệ thống bảo vệ áp suất và hiệu chuẩn van an toàn',
      status: 'published',
      publishedAt: '2026-05-15T09:00:00Z',
      createdAt: '2026-05-15T09:00:00Z',
      thumbnailImage: {
        publicUrl: '/images/hero/seminar-cover.png',
        altText: 'Hội thảo van an toàn',
      },
      content: contentObj,
      translations: {
        vi: {
          title: 'Hội Thảo Kỹ Thuật Van An Toàn',
          slug: 'hoi-thao-van-an-toan',
          shortDescription: 'Tối ưu hóa hệ thống bảo vệ áp suất và hiệu chuẩn van an toàn',
          content: contentObj,
        },
        en: {
          title: 'Technical Seminar on Safety Valves',
          slug: 'safety-valve-seminar',
          shortDescription: 'Optimizing pressure protection and safety valve calibration',
          content: contentObj,
        },
      },
    },
  ]
}

await context.route('**/*', async route => {
  const req = route.request()
  const url = new URL(req.url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api')) return route.continue()
  if (url.pathname === '/api/news-events') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createCaseStudyItem(mockParagraphs)),
    })
  }
  if (url.pathname === '/api/machines') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
})

const page = await context.newPage()
page.setDefaultTimeout(8000)
page.on('pageerror', (err) => pageErrors.push(err.message))

const pass = label => console.log(`PASS: ${label}`)

try {
  // Scenario 1: 0 paragraphs -> renders safely, no JS crash, shell/navigation exists
  pageErrors.length = 0
  mockParagraphs = []
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.page-intro-about')
  assert.equal(pageErrors.length, 0)
  assert.equal(await page.locator('.about-case-study-section').count(), 1)
  assert.equal(await page.locator('.case-study-facts').count(), 0) // No facts rendered when 0 paragraphs
  assert.equal(await page.locator('.case-study-copy h2').textContent(), 'Hội Thảo Kỹ Thuật Van An Toàn')
  pass('Scenario 1: 0 paragraphs renders safely, no crash, case study section displayed without empty facts dl')

  // Scenario 2: 1 paragraph -> only context fact rendered, no crash
  pageErrors.length = 0
  mockParagraphs = ['Đoạn văn bối cảnh dự án van an toàn tại nhà máy lọc hóa dầu.']
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.page-intro-about')
  assert.equal(pageErrors.length, 0)
  assert.equal(await page.locator('.case-study-facts').count(), 1)
  assert.equal(await page.locator('.case-study-facts dt').count(), 1)
  assert.equal(await page.locator('.case-study-facts dt').textContent(), 'Bối cảnh')
  assert.ok((await page.locator('.case-study-facts dd').textContent()).includes('Đoạn văn bối cảnh'))
  pass('Scenario 2: 1 paragraph renders context fact safely without attempting to read undefined paragraphs')

  // Scenario 3: 2 paragraphs -> context (p0) and value (p1) rendered, no approach (p2), no crash
  pageErrors.length = 0
  mockParagraphs = [
    'Đoạn văn bối cảnh thứ nhất.',
    'Đoạn văn trọng tâm giá trị kỹ thuật.',
  ]
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.page-intro-about')
  assert.equal(pageErrors.length, 0)
  assert.equal(await page.locator('.case-study-facts').count(), 1)
  const dtElements3 = await page.locator('.case-study-facts dt').allTextContents()
  assert.deepEqual(dtElements3, ['Bối cảnh', 'Trọng tâm giá trị'])
  pass('Scenario 3: 2 paragraphs renders context and value facts safely without attempting to read approach')

  // Scenario 4: 3 paragraphs -> all 3 facts rendered as originally designed
  pageErrors.length = 0
  mockParagraphs = [
    'Đoạn văn bối cảnh.',
    'Đoạn văn giá trị.',
    'Đoạn văn cách tiếp cận.',
  ]
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.page-intro-about')
  assert.equal(pageErrors.length, 0)
  assert.equal(await page.locator('.case-study-facts').count(), 1)
  const dtElements4 = await page.locator('.case-study-facts dt').allTextContents()
  assert.deepEqual(dtElements4, ['Bối cảnh', 'Cách triển khai', 'Trọng tâm giá trị'])
  pass('Scenario 4: 3 paragraphs renders all 3 facts (context, approach, value) as originally designed')

  // Scenario 5: >3 paragraphs (e.g. 5 paragraphs) -> renders all 3 facts without crash
  pageErrors.length = 0
  mockParagraphs = [
    'Đoạn văn 1.',
    'Đoạn văn 2.',
    'Đoạn văn 3.',
    'Đoạn văn 4.',
    'Đoạn văn 5.',
  ]
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.page-intro-about')
  assert.equal(pageErrors.length, 0)
  assert.equal(await page.locator('.case-study-facts').count(), 1)
  const dtElements5 = await page.locator('.case-study-facts dt').allTextContents()
  assert.deepEqual(dtElements5, ['Bối cảnh', 'Cách triển khai', 'Trọng tâm giá trị'])
  pass('Scenario 5: >3 paragraphs renders 3 facts without regression or crash')

  // Scenario 6: English mode with 1 paragraph and 2 paragraphs -> no crash on accessing 'en' of undefined
  pageErrors.length = 0
  mockParagraphs = ['Single paragraph case study in English context.']
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.page-intro-about')
  assert.equal(pageErrors.length, 0)
  assert.equal(await page.locator('.case-study-facts dt').count(), 1)
  assert.equal(await page.locator('.case-study-facts dt').textContent(), 'Context')

  // English with 2 paragraphs
  mockParagraphs = ['Context paragraph in EN.', 'Value focus paragraph in EN.']
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.page-intro-about')
  assert.equal(pageErrors.length, 0)
  const dtElementsEn = await page.locator('.case-study-facts dt').allTextContents()
  assert.deepEqual(dtElementsEn, ['Context', 'Value focus'])
  // Restore language to VI
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  pass('Scenario 6: English mode with 1 and 2 paragraphs renders safely without reading undefined .en')

  console.log('\n=== ALL QA-06 ABOUT PAGE BROWSER TESTS PASSED ===')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
