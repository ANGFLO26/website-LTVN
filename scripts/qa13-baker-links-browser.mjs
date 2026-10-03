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
    id: 'mach-baker-01',
    name: 'Van Điều Khiển Masoneilan 21000 Series',
    slug: 'masoneilan-valve-21000',
    model: 'Masoneilan 21000',
    status: 'published',
    shortDescription: 'Van điều khiển chất lượng cao',
    sortOrder: 1,
    mainImage: { publicUrl: '/images/products/masoneilan-valve-21000.png', altText: 'Van Masoneilan' },
    applications: [{ title: 'Hệ thống hơi áp lực cao', sortOrder: 1 }],
    highlights: [{ title: 'Độ kín cao', sortOrder: 1 }],
    specs: [{ groupName: 'Thông số', specName: 'Áp suất', specValue: 'ANSI Class 150 - 2500', sortOrder: 1 }],
  },
  {
    id: 'mach-pac-01',
    name: 'Thiết Bị Chưng Cất Tự Động PAC Herzog HDV 961',
    slug: 'herzog-hdv-961',
    model: 'Herzog HDV 961',
    status: 'published',
    shortDescription: 'Máy chưng cất tự động',
    sortOrder: 2,
    mainImage: { publicUrl: '/images/products/herzog-hdv-961.png', altText: 'Herzog HDV 961' },
    applications: [],
    highlights: [],
    specs: [],
  },
]

const sampleNews = [
  {
    id: 'news-01',
    title: 'Hội Thảo Kỹ Thuật Bảo Dưỡng Van An Toàn',
    slug: 'hoi-thao-van-an-toan',
    type: 'event',
    status: 'published',
    createdAt: '2026-05-15T09:00:00Z',
    publishedAt: '2026-05-15T09:00:00Z',
    shortDescription: 'Hội thảo chuyên môn van công nghiệp',
    thumbnailImage: { publicUrl: '/images/news/seminar.png', altText: 'Hội thảo' },
    content: {
      version: 1,
      blocks: [
        { type: 'paragraph', data: { text: 'Nội dung hội thảo bảo dưỡng và kiểm định van an toàn.' } },
      ],
    },
  },
  {
    id: 'news-02',
    title: 'Chuyển giao thiết bị xác định điểm đông đặc Phase Technology 70Xi',
    slug: 'chuyen-giao-dfa-70xi',
    type: 'project',
    status: 'published',
    createdAt: '2026-06-20T10:00:00Z',
    publishedAt: '2026-06-20T10:00:00Z',
    shortDescription: 'Bàn giao thiết bị phân tích điểm đông đặc',
    thumbnailImage: { publicUrl: '/images/news/project.png', altText: 'Dự án' },
    content: {
      version: 1,
      blocks: [
        { type: 'paragraph', data: { text: 'Triển khai thiết bị phân tích điểm đông đặc tại Skypec.' } },
      ],
    },
  },
]

const pageErrors = []

await context.route('**/*', async route => {
  const req = route.request()
  const url = new URL(req.url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api')) return route.continue()

  if (url.pathname === '/api/machines') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sampleMachines),
    })
  }

  if (url.pathname === '/api/news-events') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sampleNews),
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
  // Scenario 1: Product breadcrumb Baker Hughes
  // Open a Baker Hughes product (masoneilan-valve-21000)
  pageErrors.length = 0
  await page.goto(`${origin}/san-pham/masoneilan-valve-21000`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.product-detail-hero')

  // Check breadcrumb text includes 'Baker Hughes'
  const breadcrumbText = await page.locator('.breadcrumbs').textContent()
  assert.match(breadcrumbText, /Baker Hughes/, 'Breadcrumb must still display Baker Hughes as brand text')

  // Check NO clickable anchor links to /baker-hughes exist
  const bakerAnchorCount = await page.locator('a[href="/baker-hughes"]').count()
  assert.equal(bakerAnchorCount, 0, 'No anchor element pointing to /baker-hughes on Baker Hughes product page')

  // Check breadcrumb element is plain non-link span
  const bakerBreadcrumbSpan = page.locator('.breadcrumbs span').filter({ hasText: 'Baker Hughes' })
  assert.equal(await bakerBreadcrumbSpan.count(), 1, 'Baker Hughes in breadcrumb must be rendered as a non-clickable span')

  // Back to catalog link in related section must NOT point to /baker-hughes
  assert.equal(await page.locator('.section-heading a[href="/baker-hughes"]').count(), 0)
  assert.equal(pageErrors.length, 0)
  pass('Scenario 1: Product breadcrumb for Baker Hughes retains text without rendering dead link')

  // Scenario 2: Article CTA for hoi-thao-van-an-toan
  pageErrors.length = 0
  await page.goto(`${origin}/tin-tuc/hoi-thao-van-an-toan`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-page')

  // Check that NO clickable CTA to /baker-hughes exists
  const articleBakerLinks = await page.locator('a[href="/baker-hughes"]').count()
  assert.equal(articleBakerLinks, 0, 'Article must not contain any link to /baker-hughes')

  // Article page renders normally without errors
  assert.equal(await page.locator('.article-header h1').textContent(), 'Hội Thảo Kỹ Thuật Bảo Dưỡng Van An Toàn')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 2: Article with former Baker Hughes CTA omits dead link and renders normally')

  // Scenario 3: Source-visible public navigation audit across all core pages
  pageErrors.length = 0
  const routesToAudit = [
    '/',
    '/gioi-thieu',
    '/pac',
    '/tin-tuc-su-kien',
    '/lien-he',
    '/san-pham/masoneilan-valve-21000',
    '/san-pham/herzog-hdv-961',
    '/tin-tuc/hoi-thao-van-an-toan',
    '/tin-tuc/chuyen-giao-dfa-70xi',
  ]

  for (const r of routesToAudit) {
    await page.goto(`${origin}${r}`, { waitUntil: 'networkidle' })
    const deadLinks = await page.locator('a[href="/baker-hughes"]').count()
    assert.equal(deadLinks, 0, `Route ${r} must contain zero clickable links to /baker-hughes`)
  }
  assert.equal(pageErrors.length, 0)
  pass('Scenario 3: Complete crawl across all public routes verifies 0 clickable links to /baker-hughes')

  // Scenario 4: Valid links for other families (e.g. PAC) and valid CTAs remain active
  pageErrors.length = 0
  // PAC product breadcrumbs have clickable link to /pac
  await page.goto(`${origin}/san-pham/herzog-hdv-961`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.product-detail-hero')
  const pacBreadcrumbLink = page.locator('.breadcrumbs a[href="/pac"]')
  assert.equal(await pacBreadcrumbLink.count(), 1, 'PAC product must have valid active link to /pac')

  // Valid CTA for chuyen-giao-dfa-70xi points to /lien-he?chu-de=phase-70xi
  await page.goto(`${origin}/tin-tuc/chuyen-giao-dfa-70xi`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-page')
  const validCtaLink = page.locator('.article-next-action a[href="/lien-he?chu-de=phase-70xi"]')
  assert.equal(await validCtaLink.count(), 1, 'Valid non-baker CTA remains active and clickable')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 4: Valid links and CTAs for PAC and contact forms remain intact')

  // Scenario 5: Direct navigation to /baker-hughes
  pageErrors.length = 0
  await page.goto(`${origin}/baker-hughes`, { waitUntil: 'networkidle' })
  // Route is deliberately closed, so it resolves to 404 Not Found
  await page.waitForSelector('.not-found')
  const notFoundEyebrow = await page.locator('.not-found .eyebrow').textContent()
  assert.equal(notFoundEyebrow.trim(), '404', 'Direct navigation to /baker-hughes properly hits 404')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 5: Direct navigation to /baker-hughes correctly lands on 404 without server error')

  console.log('\n=== ALL QA-13 BAKER HUGHES LINKS BROWSER TESTS PASSED ===')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
