import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

// Serve the public build and intercept all API calls. Never contact a real API/database.
const dist = path.resolve('dist')
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
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

const sampleMachines = [
  {
    id: 'mach-01',
    name: 'Thiết Bị Chưng Cất Tự Động PAC Herzog HDV 961',
    slug: 'herzog-hdv-961',
    model: 'Herzog HDV 961',
    status: 'published',
    shortDescription: 'Máy chưng cất tự động hàng đầu',
    sortOrder: 1,
    mainImage: { publicUrl: '/images/products/herzog-hdv-961.png', altText: 'Herzog HDV 961' },
    applications: [{ title: 'Kiểm tra chưng cất nhiên liệu', sortOrder: 1 }],
    highlights: [{ title: 'Độ chính xác cao', sortOrder: 1 }],
    specs: [{ groupName: 'Thông số chung', specName: 'Dải nhiệt độ', specValue: '0 - 450 °C', sortOrder: 1 }],
  },
]

const sampleNews = [
  {
    id: 'news-01',
    title: 'Hội thảo kỹ thuật đo lường xăng dầu 2026',
    slug: 'hoi-thao-ky-thuat-do-luong',
    type: 'event',
    status: 'published',
    createdAt: '2026-05-15T09:00:00Z',
    publishedAt: '2026-05-15T09:00:00Z',
    shortDescription: 'Cập nhật tiêu chuẩn mới nhất cho phòng thí nghiệm',
    thumbnailImage: { publicUrl: '/images/news/seminar.png', altText: 'Hội thảo' },
    content: {
      version: 1,
      blocks: [
        { type: 'paragraph', data: { text: 'Nội dung chi tiết về hội thảo đo lường xăng dầu.' } },
      ],
    },
  },
]

let mockConfig = {
  machinesDelay: 0,
  machinesData: sampleMachines,
  newsDelay: 0,
  newsData: sampleNews,
}

const pageErrors = []

await context.route('**/*', async route => {
  const req = route.request()
  const url = new URL(req.url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api')) return route.continue()

  if (url.pathname === '/api/machines') {
    if (mockConfig.machinesDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockConfig.machinesDelay))
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockConfig.machinesData),
    })
  }

  if (url.pathname === '/api/news-events') {
    if (mockConfig.newsDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, mockConfig.newsDelay))
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockConfig.newsData),
    })
  }

  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
})

const page = await context.newPage()
page.on('pageerror', err => pageErrors.push(err.message))

function pass(name) {
  console.log(`PASS: ${name}`)
}

try {
  // Scenario 1: Product loading thật (request pending displays loading, then resolves to detail)
  mockConfig = {
    machinesDelay: 600,
    machinesData: sampleMachines,
    newsDelay: 0,
    newsData: sampleNews,
  }
  pageErrors.length = 0

  const navPromise = page.goto(`${origin}/san-pham/herzog-hdv-961`)
  // While request is pending, verify loading message appears
  await page.waitForSelector('.not-found p', { timeout: 2000 })
  const loadingText = await page.locator('.not-found p').textContent()
  assert.match(loadingText, /Đang tải thông tin sản phẩm/, 'Legitimate loading text must appear while request is pending')
  assert.equal(await page.locator('.product-detail-hero').count(), 0, 'Detail must not render while loading')

  // Wait for navigation and API completion
  await navPromise
  await page.waitForSelector('.product-detail-hero', { timeout: 3000 })
  assert.equal(await page.locator('.product-detail-hero').count(), 1, 'Product detail must render once API completes')
  assert.equal(await page.locator('.not-found').count(), 0, 'Loading state must disappear once data is loaded')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 1: Product loading thật: displays loading while pending, then renders detail')

  // Scenario 2: Product API trả [] (empty collection, no infinite loading, renders 404)
  mockConfig = {
    machinesDelay: 0,
    machinesData: [],
    newsDelay: 0,
    newsData: [],
  }
  pageErrors.length = 0

  await page.goto(`${origin}/san-pham/herzog-hdv-961`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.not-found', { timeout: 2000 })
  const eyebrowText = await page.locator('.not-found .eyebrow').textContent()
  assert.equal(eyebrowText.trim(), '404', '404 eyebrow must be displayed when collection is empty')
  const h1Text = await page.locator('.not-found h1').textContent()
  assert.equal(h1Text.trim(), 'Không tìm thấy sản phẩm', 'Not found heading must be displayed')
  assert.equal(await page.locator('.not-found p').count(), 0, 'No infinite loading paragraph')
  assert.equal(await page.locator('.not-found a[href="/pac"]').count(), 1, 'Back to catalog link exists')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 2: Product API returns []: no infinite loading, renders 404 not-found')

  // Scenario 3: Product list có data nhưng slug không tồn tại
  mockConfig = {
    machinesDelay: 0,
    machinesData: sampleMachines,
    newsDelay: 0,
    newsData: sampleNews,
  }
  pageErrors.length = 0

  await page.goto(`${origin}/san-pham/non-existent-slug-xyz`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.not-found', { timeout: 2000 })
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  assert.equal(await page.locator('.not-found h1').textContent(), 'Không tìm thấy sản phẩm')
  assert.equal(await page.locator('.not-found p').count(), 0, 'No loading text')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 3: Product list has data but slug does not exist: renders 404')

  // Scenario 4: Article API trả [] (empty news collection, no infinite loading, renders 404)
  mockConfig = {
    machinesDelay: 0,
    machinesData: [],
    newsDelay: 0,
    newsData: [],
  }
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc/hoi-thao-ky-thuat-do-luong`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.not-found', { timeout: 2000 })
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  assert.equal(await page.locator('.not-found h1').textContent(), 'Không tìm thấy bài viết')
  assert.equal(await page.locator('.not-found p').count(), 0, 'No infinite loading text')
  assert.equal(await page.locator('.not-found a[href="/tin-tuc-su-kien"]').count(), 1, 'Back to news link exists')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 4: Article API returns []: no infinite loading, renders 404 not-found')

  // Scenario 5: Article list có data nhưng slug không tồn tại
  mockConfig = {
    machinesDelay: 0,
    machinesData: sampleMachines,
    newsDelay: 0,
    newsData: sampleNews,
  }
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc/non-existent-article-slug`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.not-found', { timeout: 2000 })
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  assert.equal(await page.locator('.not-found h1').textContent(), 'Không tìm thấy bài viết')
  assert.equal(await page.locator('.not-found p').count(), 0, 'No loading text')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 5: Article list has data but slug does not exist: renders 404')

  // Scenario 6: Valid article/product renders complete detail normally
  mockConfig = {
    machinesDelay: 0,
    machinesData: sampleMachines,
    newsDelay: 0,
    newsData: sampleNews,
  }
  pageErrors.length = 0

  // Valid product
  await page.goto(`${origin}/san-pham/herzog-hdv-961`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.product-detail-hero')
  assert.equal(await page.locator('.product-detail-hero h1').textContent(), 'Herzog HDV 961')
  assert.equal(await page.locator('.product-facts').count(), 1)
  assert.equal(await page.locator('.product-gallery img').count(), 1)

  // Valid article
  await page.goto(`${origin}/tin-tuc/hoi-thao-ky-thuat-do-luong`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-page')
  assert.equal(await page.locator('.article-header h1').textContent(), 'Hội thảo kỹ thuật đo lường xăng dầu 2026')
  assert.equal(await page.locator('.article-body p').textContent(), 'Nội dung chi tiết về hội thảo đo lường xăng dầu.')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 6: Valid product and article render full details without regression')

  // Scenario 7: Draft/non-published entity not returned by public API renders 404, not draft content
  // Per QA-07, public API only returns published items. A draft slug is not in API response.
  mockConfig = {
    machinesDelay: 0,
    machinesData: sampleMachines, // does not contain 'draft-machine-1'
    newsDelay: 0,
    newsData: sampleNews, // does not contain 'draft-news-1'
  }
  pageErrors.length = 0

  await page.goto(`${origin}/san-pham/draft-machine-1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.not-found')
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  assert.equal(await page.locator('.not-found h1').textContent(), 'Không tìm thấy sản phẩm')

  await page.goto(`${origin}/tin-tuc/draft-news-1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.not-found')
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  assert.equal(await page.locator('.not-found h1').textContent(), 'Không tìm thấy bài viết')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 7: Draft/non-published content absent from public API renders 404, no leakage')

  console.log('\n=== ALL QA-11 DETAIL STATE BROWSER TESTS PASSED ===')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
