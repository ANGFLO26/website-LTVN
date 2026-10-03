import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

// Serve the public build and intercept all API calls. Never contact a real database.
const dist = path.resolve('dist')
const output = path.resolve(process.env.QA14C4_OUTPUT || 'artifacts/qa-2026-10-03/qa14c4v')
await mkdir(output, { recursive: true })
const results = []
const proof = {}
const dataSource = await readFile('src/context/DataContext.tsx', 'utf8')
const newsAdapterSource = dataSource.slice(dataSource.indexOf('function parseBlocksForLocale('), dataSource.indexOf('export function DataProvider('))
const synthesizedCalls = (newsAdapterSource.match(/\b(?:autoTranslate|autoLocalized|toLocalized)\s*\(/g) || []).length
assert.equal(synthesizedCalls, 0, 'Dynamic News must never call synthesized translators')
assert.ok(!/\b(?:viBlocks|enBlocks)\s*\[/.test(newsAdapterSource), 'No locale tree indexing/parallel block pairing')
proof.synthesizedTranslationCalls = synthesizedCalls
console.log(`Dynamic News synthesized translation calls = ${synthesizedCalls}`)
const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
}

const server = createServer(async (req, res) => {
  let file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname)
  if (!file.startsWith(dist + path.sep) && file !== dist) {
    res.writeHead(403)
    res.end()
    return
  }
  try {
    if (!(await stat(file)).isFile()) file = path.join(dist, 'index.html')
  } catch {
    file = path.join(dist, 'index.html')
  }
  try {
    res.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream')
    res.end(await readFile(file))
  } catch {
    res.writeHead(404)
    res.end()
  }
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })

let mockNews = []
const pageErrors = []

await context.route('**/*', async (route) => {
  const req = route.request()
  const url = new URL(req.url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api')) return route.continue()

  if (url.pathname === '/api/news-events') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockNews),
    })
  }

  if (url.pathname === '/api/machines') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    })
  }

  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
})

const page = await context.newPage()
page.setDefaultTimeout(8000)
page.on('pageerror', (err) => pageErrors.push(err.message))

try {
  await context.addInitScript(() => localStorage.setItem('ltv-language', 'vi'));
  mockNews = [{ id: 'legacy-location-audit', type: 'event', status: 'published', title: 'Legacy location audit',
    slug: 'legacy-location-audit', shortDescription: 'Legacy excerpt remains available', location: 'Địa điểm legacy cần giữ',
    content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Legacy body remains available' } }] },
    createdAt: '2026-10-01T00:00:00Z' }];
  await page.goto(origin + '/tin-tuc/legacy-location-audit', { waitUntil: 'networkidle' });
  await page.locator('.article-header h1').waitFor();
  assert.equal(await page.locator('.article-header h1').innerText(), mockNews[0].title);
  assert.ok((await page.locator('.article-body').innerText()).includes('Legacy body remains available'));
  const locations = await page.locator('.article-location').count();
  assert.equal(locations, 0);
  assert.equal((await page.locator('body').innerText()).includes(mockNews[0].location), false);
  assert.deepEqual(pageErrors, []);
  await page.screenshot({ path: 'artifacts/final-01-2026-10-03/legacy-location-missing.png' });
  const finding = { id: 'FINAL-01-B3', severity: 'P2', environment: 'Production public build; Chromium; legacy response mock without translations; no DB',
    expected: 'Legacy VI article retains its authored top-level location', actual: 'Title/excerpt/body render in VI but location is discarded',
    sourceLocation: mockNews[0].location, domLocationCount: locations, pageErrors };
  await writeFile('artifacts/final-01-2026-10-03/legacy-location-proof.json', JSON.stringify(finding,null,2));
  console.log('CONFIRMED FINAL-01-B3: legacy VI top-level location is absent from the rendered article.');
} finally { await browser.close(); server.close(); }
