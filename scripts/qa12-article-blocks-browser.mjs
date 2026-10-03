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

let mockNews = []
const pageErrors = []

await context.route('**/*', async route => {
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
page.on('pageerror', err => pageErrors.push(err.message))

function pass(name) {
  console.log(`PASS: ${name}`)
}

try {
  // Scenario 1 & 8: Mixed blocks rendered in exact DOM order
  // 1. heading, 2. paragraph, 3. bullet_list, 4. image, 5. paragraph
  mockNews = [
    {
      id: 'news-mixed-01',
      title: 'Bản tin thử nghiệm khối nội dung đa dạng',
      slug: 'qa-mixed-article',
      type: 'news',
      status: 'published',
      createdAt: '2026-09-01T00:00:00.000Z',
      publishedAt: '2026-09-01T00:00:00.000Z',
      thumbnailImage: { publicUrl: '/images/hero/portfolio-hero-v5.png', altText: 'Hero thumb' },
      content: {
        version: 1,
        blocks: [
          { type: 'heading', data: { level: 2, text: 'QA HEADING REQUIRED' } },
          { type: 'paragraph', data: { text: 'QA PARAGRAPH PRESENT 1' } },
          { type: 'bullet_list', data: { items: ['QA LIST ITEM A', 'QA LIST ITEM B'] } },
          { type: 'image', data: { url: '/images/products/masoneilan-valve-21000.png', alt: 'QA BODY IMAGE', caption: 'Hình ảnh thực tế' } },
          { type: 'paragraph', data: { text: 'QA PARAGRAPH PRESENT 2' } },
        ],
      },
    },
  ]
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc/qa-mixed-article`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  const childTags = await page.evaluate(() => {
    const container = document.querySelector('.article-body')
    return Array.from(container.children).map(el => el.tagName.toUpperCase())
  })
  // Expected exactly 5 elements in order: H2, P, UL, FIGURE, P
  assert.deepEqual(childTags, ['H2', 'P', 'UL', 'FIGURE', 'P'], 'Exact 5 blocks rendered in order')

  assert.equal(await page.locator('.article-body h2').textContent(), 'QA HEADING REQUIRED')
  assert.equal(await page.locator('.article-body p').first().textContent(), 'QA PARAGRAPH PRESENT 1')
  const listItems = await page.locator('.article-body ul li').allTextContents()
  assert.deepEqual(listItems, ['QA LIST ITEM A', 'QA LIST ITEM B'])
  assert.equal(await page.locator('.article-body figure img').getAttribute('src'), '/images/products/masoneilan-valve-21000.png')
  assert.equal(await page.locator('.article-body figure img').getAttribute('alt'), 'QA BODY IMAGE')
  assert.equal(await page.locator('.article-body figure figcaption').textContent(), 'Hình ảnh thực tế')
  assert.equal(await page.locator('.article-body p').nth(1).textContent(), 'QA PARAGRAPH PRESENT 2')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 1 & 8: Mixed blocks (heading, paragraph, bullet_list, image, paragraph) rendered in exact DOM order')

  // Scenario 2: Paragraph-only legacy content
  // Preserves existing behavior with section title "Thông tin hoạt động"
  mockNews = [
    {
      id: 'news-legacy-01',
      title: 'Bản tin dạng paragraph truyền thống',
      slug: 'qa-legacy-paragraphs',
      type: 'news',
      status: 'published',
      createdAt: '2026-09-01T00:00:00.000Z',
      publishedAt: '2026-09-01T00:00:00.000Z',
      content: {
        version: 1,
        blocks: [
          { type: 'paragraph', data: { text: 'Đoạn văn thứ nhất của bài viết.' } },
          { type: 'paragraph', data: { text: 'Đoạn văn thứ hai của bài viết.' } },
        ],
      },
    },
  ]
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc/qa-legacy-paragraphs`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  const legacyH2 = await page.locator('.article-body h2').textContent()
  assert.equal(legacyH2, 'Thông tin hoạt động', 'Paragraph-only article retains default section heading')
  const legacyParagraphs = await page.locator('.article-body p').allTextContents()
  assert.deepEqual(legacyParagraphs, ['Đoạn văn thứ nhất của bài viết.', 'Đoạn văn thứ hai của bài viết.'])
  assert.equal(pageErrors.length, 0)
  pass('Scenario 2: Paragraph-only legacy content renders section heading and paragraphs without regression')

  // Scenario 3: Heading semantic level + Bullet list
  mockNews = [
    {
      id: 'news-headings-01',
      title: 'Kiểm tra heading semantic và danh sách',
      slug: 'qa-semantic-heading-list',
      type: 'news',
      status: 'published',
      createdAt: '2026-09-01T00:00:00.000Z',
      publishedAt: '2026-09-01T00:00:00.000Z',
      content: {
        version: 1,
        blocks: [
          { type: 'heading', data: { level: 3, text: 'Tiêu đề cấp độ 3 H3' } },
          { type: 'bullet_list', data: { items: ['Quy chuẩn ASTM D86', 'Quy chuẩn ASTM D93', 'Quy chuẩn ISO 3405'] } },
        ],
      },
    },
  ]
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc/qa-semantic-heading-list`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  assert.equal(await page.locator('.article-body h3').count(), 1, 'H3 element must be used when level=3')
  assert.equal(await page.locator('.article-body h3').textContent(), 'Tiêu đề cấp độ 3 H3')
  const standardsItems = await page.locator('.article-body ul li').allTextContents()
  assert.deepEqual(standardsItems, ['Quy chuẩn ASTM D86', 'Quy chuẩn ASTM D93', 'Quy chuẩn ISO 3405'])
  assert.equal(pageErrors.length, 0)
  pass('Scenario 3: Semantic heading (H3) and bullet list items rendered with correct hierarchy')

  // Scenario 4: Image block uses exact block URL, not article thumbnail
  mockNews = [
    {
      id: 'news-image-01',
      title: 'Kiểm tra render ảnh trong bài viết',
      slug: 'qa-image-article',
      type: 'news',
      status: 'published',
      createdAt: '2026-09-01T00:00:00.000Z',
      publishedAt: '2026-09-01T00:00:00.000Z',
      thumbnailImage: { publicUrl: '/images/hero/thumbnail-specific.png', altText: 'Thumbnail cover' },
      content: {
        version: 1,
        blocks: [
          {
            type: 'image',
            data: {
              url: '/images/products/herzog-hdv-961.png',
              alt: 'Ảnh máy Herzog chuyên dụng',
              caption: 'Thiết bị HDV 961 trong phòng kiểm chuẩn',
            },
          },
        ],
      },
    },
  ]
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc/qa-image-article`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  const inlineImg = page.locator('.article-body figure img')
  assert.equal(await inlineImg.count(), 1, 'Inline image must be rendered')
  assert.equal(await inlineImg.getAttribute('src'), '/images/products/herzog-hdv-961.png', 'Must use block url, NOT article thumbnail')
  assert.equal(await inlineImg.getAttribute('alt'), 'Ảnh máy Herzog chuyên dụng')
  assert.equal(await page.locator('.article-body figure figcaption').textContent(), 'Thiết bị HDV 961 trong phòng kiểm chuẩn')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 4: Image block uses explicit block url, alt, caption and does not substitute thumbnail')

  // Scenario 5: Malformed or unknown blocks are safely skipped without crash
  mockNews = [
    {
      id: 'news-malformed-01',
      title: 'Bài viết chứa block không xác định',
      slug: 'qa-malformed-blocks',
      type: 'news',
      status: 'published',
      createdAt: '2026-09-01T00:00:00.000Z',
      publishedAt: '2026-09-01T00:00:00.000Z',
      content: {
        version: 1,
        blocks: [
          { type: 'unsupported_unknown_widget', data: { unknownKey: 'value' } },
          null,
          { type: 'image', data: { alt: 'No URL image' } }, // Missing URL
          { type: 'bullet_list', data: { items: [] } }, // Empty items
          { type: 'image', data: { url: 'javascript:alert(1)' } }, // Dangerous protocol rejected
          { type: 'paragraph', data: { text: 'Đoạn văn an toàn và hợp lệ.' } },
        ],
      },
    },
  ]
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc/qa-malformed-blocks`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  assert.equal(await page.locator('.article-body p').textContent(), 'Đoạn văn an toàn và hợp lệ.')
  assert.equal(await page.locator('.article-body img').count(), 0, 'Malformed image without url or with javascript: protocol was rejected')
  assert.equal(await page.locator('.article-body ul').count(), 0, 'Empty bullet list was omitted')
  assert.equal(pageErrors.length, 0, 'No JavaScript error or crash occurred')
  pass('Scenario 5: Malformed and unknown blocks skipped safely without crash or XSS')

  // Scenario 6: Empty content blocks [] renders article shell without crash or infinite loading
  mockNews = [
    {
      id: 'news-empty-01',
      title: 'Bài viết có nội dung rỗng',
      slug: 'qa-empty-content-article',
      type: 'news',
      status: 'published',
      createdAt: '2026-09-01T00:00:00.000Z',
      publishedAt: '2026-09-01T00:00:00.000Z',
      content: {
        version: 1,
        blocks: [],
      },
    },
  ]
  pageErrors.length = 0

  await page.goto(`${origin}/tin-tuc/qa-empty-content-article`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-page')

  assert.equal(await page.locator('.article-header h1').textContent(), 'Bài viết có nội dung rỗng')
  assert.equal(await page.locator('.not-found').count(), 0, 'Must NOT trigger 404 or infinite loading')
  assert.equal(pageErrors.length, 0)
  pass('Scenario 6: Empty blocks [] renders article shell cleanly without crash or infinite loading')

  // Scenario 7: Multilingual VI / EN blocks render authentic translated fields without auto-translate
  mockNews = [
    {
      id: 'news-bilingual-01',
      title: 'Tiêu đề song ngữ bài viết',
      slug: 'qa-bilingual-article',
      type: 'news',
      status: 'published',
      createdAt: '2026-09-01T00:00:00.000Z',
      publishedAt: '2026-09-01T00:00:00.000Z',
      content: {
        version: 1,
        blocks: [
          {
            type: 'heading',
            data: {
              level: 2,
              text: { vi: 'Tiêu đề tiếng Việt có chủ đích', en: 'Authored English Heading' },
            },
          },
          {
            type: 'paragraph',
            data: {
              text: { vi: 'Đoạn văn tiếng Việt nguyên bản', en: 'Authored English Paragraph' },
            },
          },
          {
            type: 'bullet_list',
            data: {
              items: [
                { vi: 'Mục tiếng Việt 1', en: 'English Item 1' },
                { vi: 'Mục tiếng Việt 2', en: 'English Item 2' },
              ],
            },
          },
        ],
      },
    },
  ]
  pageErrors.length = 0

  // 7A: Vietnamese mode
  // QA-14 response contract: EN requires an authored translations.en record.
  // Keep the original exact text assertions and independent authored locale trees.
  mockNews[0].translations = {
    vi: {
      title: 'Tiêu đề song ngữ bài viết', slug: 'qa-bilingual-article',
      content: { version: 1, blocks: [
        { type: 'heading', data: { level: 2, text: 'Tiêu đề tiếng Việt có chủ đích' } },
        { type: 'paragraph', data: { text: 'Đoạn văn tiếng Việt nguyên bản' } },
        { type: 'bullet_list', data: { items: ['Mục tiếng Việt 1', 'Mục tiếng Việt 2'] } },
      ] },
    },
    en: {
      title: 'Authored English Article Title', slug: 'qa-bilingual-article-en',
      content: { version: 1, blocks: [
        { type: 'heading', data: { level: 2, text: 'Authored English Heading' } },
        { type: 'paragraph', data: { text: 'Authored English Paragraph' } },
        { type: 'bullet_list', data: { items: ['English Item 1', 'English Item 2'] } },
      ] },
    },
  }
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  await page.goto(`${origin}/tin-tuc/qa-bilingual-article`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  assert.equal(await page.locator('.article-body h2').textContent(), 'Tiêu đề tiếng Việt có chủ đích')
  assert.equal(await page.locator('.article-body p').textContent(), 'Đoạn văn tiếng Việt nguyên bản')
  assert.deepEqual(await page.locator('.article-body ul li').allTextContents(), ['Mục tiếng Việt 1', 'Mục tiếng Việt 2'])

  // 7B: English mode
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/tin-tuc/qa-bilingual-article`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  assert.equal(await page.locator('.article-body h2').textContent(), 'Authored English Heading')
  assert.equal(await page.locator('.article-body p').textContent(), 'Authored English Paragraph')
  assert.deepEqual(await page.locator('.article-body ul li').allTextContents(), ['English Item 1', 'English Item 2'])

  // Restore VI mode
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  assert.equal(pageErrors.length, 0)
  pass('Scenario 7: Multilingual VI / EN blocks render authored bilingual fields accurately')

  console.log('\n=== ALL QA-12 ARTICLE BLOCKS BROWSER TESTS PASSED ===')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
