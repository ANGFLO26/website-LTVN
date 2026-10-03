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
  },
  {
    id: 'mach-02',
    name: 'Thiết Bị Điểm Đông Đặc ISL FPP 5Gs',
    slug: 'isl-fpp-5gs',
    model: 'ISL FPP 5Gs',
    status: 'published',
    shortDescription: 'Máy đo điểm đông đặc tự động',
    sortOrder: 2,
    mainImage: { publicUrl: '/images/products/isl-fpp-5gs.png', altText: 'ISL FPP 5Gs' },
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
    shortDescription: 'Cập nhật tiêu chuẩn mới nhất cho phòng thí nghiệm',
    thumbnailImage: { publicUrl: '/images/news/seminar.png', altText: 'Hội thảo' },
  },
  {
    id: 'news-02',
    title: 'Giải pháp kiểm chuẩn van tự động',
    slug: 'giai-phap-kiem-chuan-van-tu-dong',
    type: 'news',
    status: 'published',
    createdAt: '2026-06-20T10:00:00Z',
    shortDescription: 'Tối ưu độ chính xác và giảm thiểu thời gian dừng máy',
    thumbnailImage: { publicUrl: '/images/news/valve.png', altText: 'Kiểm chuẩn van' },
  },
  {
    id: 'news-03',
    title: 'Triển khai dự án lọc hóa dầu Nghi Sơn',
    slug: 'trien-khai-du-an-nghi-son',
    type: 'project',
    status: 'published',
    createdAt: '2026-07-01T08:00:00Z',
    shortDescription: 'Cung cấp và lắp đặt thiết bị phân tích',
    thumbnailImage: { publicUrl: '/images/news/project.png', altText: 'Dự án' },
  },
]

let mockMachines = { mode: 'data', data: sampleMachines }
let mockNews = { mode: 'data', data: sampleNews }

const pageErrors = []

await context.route('**/*', async route => {
  const req = route.request()
  const url = new URL(req.url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api')) return route.continue()

  if (url.pathname === '/api/machines') {
    if (mockMachines.mode === 'abort') {
      return route.abort('failed')
    }
    if (mockMachines.mode === '500') {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMachines.data),
    })
  }

  if (url.pathname === '/api/news-events') {
    if (mockNews.mode === 'abort') {
      return route.abort('failed')
    }
    if (mockNews.mode === '500') {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockNews.data),
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
  // Scenario 1: Machines: data -> []
  // Initial: API returns 2 machines. UI renders machines under /pac.
  mockMachines = { mode: 'data', data: sampleMachines }
  mockNews = { mode: 'data', data: sampleNews }
  pageErrors.length = 0

  await page.goto(`${origin}/pac`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.product-card')
  const initialCardsCount = await page.locator('.product-card').count()
  assert.equal(initialCardsCount, 2, 'Initial machines count should be 2')
  assert.equal(await page.locator('.empty-state').count(), 0, 'Empty state should not be visible when data exists')
  const metaText = await page.locator('.catalog-result-meta span').textContent()
  assert.match(metaText, /2\s+sản phẩm/, 'Meta should display 2 sản phẩm')

  // API now returns []
  mockMachines = { mode: 'data', data: [] }
  // Trigger refetch using current application mechanism: window focus event
  const [refetchMachinesRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/machines') && res.status() === 200),
    page.evaluate(() => window.dispatchEvent(new Event('focus'))),
  ])
  assert.equal(refetchMachinesRes.status(), 200)

  // Verify UI removes old machines and displays EmptyState
  await page.waitForSelector('.empty-state')
  const updatedCardsCount = await page.locator('.product-card').count()
  assert.equal(updatedCardsCount, 0, 'Product cards must be 0 after API returns []')
  const updatedMetaText = await page.locator('.catalog-result-meta span').textContent()
  assert.match(updatedMetaText, /0\s+sản phẩm/, 'Meta count must be updated to 0')
  assert.equal(pageErrors.length, 0, 'No errors during data -> [] transition')
  pass('Scenario 1: Machines data -> [] clears stale products and displays empty state')

  // Scenario 2: News: data -> []
  mockMachines = { mode: 'data', data: [] }
  mockNews = { mode: 'data', data: sampleNews }
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.news-card')
  const initialNewsCount = await page.locator('.news-card').count()
  assert.equal(initialNewsCount, 2, 'Initial news cards count should be 2 (1 featured aside + 2 cards)')
  assert.equal(await page.locator('.news-hero-feature').count(), 1, 'Featured aside should exist when news exists')
  assert.equal(await page.locator('.empty-state').count(), 0, 'Empty state should not be visible when news exists')

  // API now returns []
  mockNews = { mode: 'data', data: [] }
  const [refetchNewsRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/news-events') && res.status() === 200),
    page.evaluate(() => window.dispatchEvent(new Event('focus'))),
  ])
  assert.equal(refetchNewsRes.status(), 200)

  // Verify UI removes old news items, removes featured hero, and displays EmptyState
  await page.waitForSelector('.empty-state')
  const updatedNewsCount = await page.locator('.news-card').count()
  assert.equal(updatedNewsCount, 0, 'News cards must be 0 after API returns []')
  assert.equal(await page.locator('.news-hero-feature').count(), 0, 'Featured hero must be gone after API returns []')
  const updatedNewsMetaText = await page.locator('.news-result-count').textContent()
  assert.match(updatedNewsMetaText, /0\s+bài viết/, 'News meta count must be updated to 0')
  assert.equal(pageErrors.length, 0, 'No errors during news data -> [] transition')
  pass('Scenario 2: News data -> [] clears stale news items and displays empty state')

  // Scenario 3: [] right from initial load
  mockMachines = { mode: 'data', data: [] }
  mockNews = { mode: 'data', data: [] }
  pageErrors.length = 0

  await page.goto(`${origin}/pac`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.empty-state')
  assert.equal(await page.locator('.product-card').count(), 0, 'No product cards when API starts with []')
  const initialEmptyMeta = await page.locator('.catalog-result-meta span').textContent()
  assert.match(initialEmptyMeta, /0\s+sản phẩm/, 'Initial empty shows 0 products')

  await page.goto(`${origin}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.empty-state')
  assert.equal(await page.locator('.news-card').count(), 0, 'No news cards when API starts with []')
  assert.equal(await page.locator('.news-hero-feature').count(), 0, 'No featured hero when API starts with []')
  const initialEmptyNewsMeta = await page.locator('.news-result-count').textContent()
  assert.match(initialEmptyNewsMeta, /0\s+bài viết/, 'Initial empty shows 0 news')
  assert.equal(pageErrors.length, 0, 'No crash or error on initial [] response')
  pass('Scenario 3: Initial [] response correctly shows empty state without retaining default static items or crashing')

  // Scenario 4: [] -> data (Recovery / Adding items)
  mockMachines = { mode: 'data', data: [] }
  mockNews = { mode: 'data', data: [] }
  pageErrors.length = 0

  await page.goto(`${origin}/pac`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.empty-state')
  assert.equal(await page.locator('.product-card').count(), 0)

  // API now returns 1 machine
  mockMachines = { mode: 'data', data: [sampleMachines[0]] }
  const [refetchNewDataRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/machines') && res.status() === 200),
    page.evaluate(() => window.dispatchEvent(new Event('focus'))),
  ])
  assert.equal(refetchNewDataRes.status(), 200)

  await page.waitForSelector('.product-card')
  assert.equal(await page.locator('.product-card').count(), 1, 'Product card appears when data is added')
  assert.equal(await page.locator('.empty-state').count(), 0, 'Empty state removed when data is present')
  const recoveredMetaText = await page.locator('.catalog-result-meta span').textContent()
  assert.match(recoveredMetaText, /1\s+sản phẩm/, 'Meta shows 1 sản phẩm')
  assert.equal(pageErrors.length, 0, 'No errors during [] -> data transition')
  pass('Scenario 4: [] -> data updates state normally and displays new items')

  // Scenario 5: Network / API failure does NOT clear state to []
  mockMachines = { mode: 'data', data: [sampleMachines[0]] }
  mockNews = { mode: 'data', data: [sampleNews[0]] }
  pageErrors.length = 0

  await page.goto(`${origin}/pac`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.product-card')
  assert.equal(await page.locator('.product-card').count(), 1)

  // API fails with 500 error on re-fetch
  mockMachines = { mode: '500' }
  const [failRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/machines') && res.status() === 500),
    page.evaluate(() => window.dispatchEvent(new Event('focus'))),
  ])
  assert.equal(failRes.status(), 500)

  // Wait a small duration to ensure state remains stable
  await page.waitForTimeout(300)
  assert.equal(await page.locator('.product-card').count(), 1, 'HTTP 500 must NOT clear existing products')
  assert.equal(await page.locator('.empty-state').count(), 0, 'Empty state must NOT be shown on HTTP 500 failure')

  // Network abort / offline on re-fetch
  mockMachines = { mode: 'abort' }
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.waitForTimeout(300)
  assert.equal(await page.locator('.product-card').count(), 1, 'Network drop must NOT clear existing products')
  assert.equal(await page.locator('.empty-state').count(), 0, 'Empty state must NOT be shown on network drop')
  pass('Scenario 5: Network/API failure preserves existing data and is not misidentified as empty []')

  console.log('\n=== ALL QA-10 EMPTY STATE BROWSER TESTS PASSED ===')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
