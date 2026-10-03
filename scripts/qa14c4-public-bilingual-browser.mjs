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

function pass(name) {
  results.push({ name, result: 'PASS' })
  console.log(`PASS: ${name}`)
}

// Standard test dataset
const articleViOnly = {
  id: 'art-vi-only-01',
  type: 'news',
  title: 'Hội thảo đào tạo nội bộ tiếng Việt',
  slug: 'hoi-thao-dao-tao-noi-bo',
  shortDescription: 'Mô tả tóm tắt tiếng Việt của bài viết chỉ có tiếng Việt.',
  status: 'published',
  createdAt: '2026-08-01T00:00:00.000Z',
  publishedAt: '2026-08-01T00:00:00.000Z',
  thumbnailImage: { publicUrl: '/images/hero/portfolio-hero-v5.png', altText: 'Vi only thumb' },
  translations: {
    vi: {
      title: 'Hội thảo đào tạo nội bộ tiếng Việt',
      slug: 'hoi-thao-dao-tao-noi-bo',
      shortDescription: 'Mô tả tóm tắt tiếng Việt của bài viết chỉ có tiếng Việt.',
      location: 'Hà Nội',
      content: {
        version: 1,
        blocks: [
          { type: 'paragraph', data: { text: 'Nội dung chi tiết tiếng Việt duy nhất.' } },
        ],
      },
    },
    en: null,
  },
}

const articleBilingual = {
  id: 'art-bilingual-02',
  type: 'event',
  title: 'Hội thảo kỹ thuật PAC 2026',
  slug: 'hoi-thao-pac-2026',
  shortDescription: 'Hội thảo chuyên sâu về thiết bị phân tích PAC năm 2026.',
  status: 'published',
  createdAt: '2026-09-01T00:00:00.000Z',
  publishedAt: '2026-09-01T00:00:00.000Z',
  thumbnailImage: { publicUrl: '/images/hero/portfolio-hero-v5.png', altText: 'Bilingual thumb' },
  translations: {
    vi: {
      title: 'Hội thảo kỹ thuật PAC 2026',
      slug: 'hoi-thao-pac-2026',
      shortDescription: 'Hội thảo chuyên sâu về thiết bị phân tích PAC năm 2026.',
      location: 'Trung tâm Quatest 2, Đà Nẵng',
      content: {
        version: 1,
        blocks: [
          { type: 'heading', data: { level: 2, text: 'Chuyên đề phân tích ASTM D86' } },
          { type: 'paragraph', data: { text: 'Đoạn văn giới thiệu nội dung kỹ thuật tiếng Việt.' } },
          { type: 'image', data: { url: '/images/products/masoneilan-valve-21000.png', alt: 'Hình ảnh thực tế', caption: 'Thiết bị tại phòng thí nghiệm' } },
          { type: 'paragraph', data: { text: 'Đoạn văn kết luận phiên hội thảo kỹ thuật.' } },
          { type: 'quote', data: { text: 'Độ chính xác là ưu tiên số một trong phòng kiểm nghiệm.', author: 'Kỹ sư trưởng LTVN' } },
        ],
      },
    },
    en: {
      title: '2026 PAC Technical Seminar',
      slug: '2026-pac-seminar',
      shortDescription: 'In-depth seminar on PAC analytical instruments in 2026.',
      location: 'Quatest 2 Testing Center, Da Nang',
      content: {
        version: 1,
        blocks: [
          { type: 'paragraph', data: { text: 'Authored English overview paragraph for international delegates.' } },
          { type: 'bullet_list', data: { items: ['ASTM D86 Automated Distillation', 'ASTM D93 Flash Point Testing', 'ISO 3405 Compliance'] } },
          { type: 'heading', data: { level: 3, text: 'Authored English Technical Keynotes' } },
        ],
      },
    },
  },
}

const articleDraftBilingual = {
  id: 'art-draft-03',
  type: 'project',
  title: 'Dự án đang soạn thảo chưa xuất bản',
  slug: 'du-an-dang-soan-thao',
  shortDescription: 'Bản thảo dự án.',
  status: 'draft',
  createdAt: '2026-09-10T00:00:00.000Z',
  publishedAt: null,
  thumbnailImage: { publicUrl: '/images/hero/portfolio-hero-v5.png', altText: 'Draft thumb' },
  translations: {
    vi: {
      title: 'Dự án đang soạn thảo chưa xuất bản',
      slug: 'du-an-dang-soan-thao',
      shortDescription: 'Bản thảo dự án.',
      content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Nội dung bản nháp bí mật.' } }] },
    },
    en: {
      title: 'Draft Project Not Published',
      slug: 'draft-project-unreleased',
      shortDescription: 'Draft summary.',
      content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Secret draft content in English.' } }] },
    },
  },
}

const articleLegacy = {
  id: 'art-legacy-04',
  type: 'news',
  title: 'Bản tin di sản không có translations',
  slug: 'ban-tin-di-san-khong-translations',
  shortDescription: 'Mô tả ngắn của bản tin di sản trước QA-14.',
  status: 'published',
  createdAt: '2026-07-01T00:00:00.000Z',
  publishedAt: '2026-07-01T00:00:00.000Z',
  thumbnailImage: { publicUrl: '/images/hero/portfolio-hero-v5.png', altText: 'Legacy thumb' },
  content: {
    version: 1,
    blocks: [
      { type: 'paragraph', data: { text: 'Nội dung chi tiết của bản tin di sản tiếng Việt.' } },
    ],
  },
}

async function setLanguage(lang) {
  await page.evaluate((l) => {
    localStorage.setItem('ltv-language', l)
  }, lang)
}

try {
  mockNews = [articleViOnly, articleBilingual, articleDraftBilingual, articleLegacy]
  await page.goto(origin, { waitUntil: 'networkidle' })

  // =========================================================================
  // T1: VI list — VI-only + bilingual visible, draft hidden
  // =========================================================================
  pageErrors.length = 0
  await setLanguage('vi')
  await page.goto(`${origin}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.news-grid')

  const allViVisibleTitles = await page.locator('.news-card h3 a, .news-hero-feature strong').allTextContents()
  assert.deepEqual([...allViVisibleTitles].sort(), [articleViOnly.title, articleBilingual.title, articleLegacy.title].sort())
  assert.ok(allViVisibleTitles.some(t => t.includes('Hội thảo đào tạo nội bộ tiếng Việt')), 'VI-only article A must be visible in VI list')
  assert.ok(allViVisibleTitles.some(t => t.includes('Hội thảo kỹ thuật PAC 2026')), 'Bilingual article B must be visible in VI list')
  assert.ok(!allViVisibleTitles.some(t => t.includes('Dự án đang soạn thảo')), 'Draft article C must be hidden')
  assert.ok(!allViVisibleTitles.some(t => t.includes('Draft Project Not Published')), 'Draft EN must be hidden')
  assert.equal(pageErrors.length, 0)
  pass('T1: VI list — VI-only + bilingual visible, draft hidden')

  // =========================================================================
  // T2: EN list — only authored EN visible, VI-only hidden
  // =========================================================================
  pageErrors.length = 0
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.news-hero-feature, .news-grid')

  const allEnVisibleTitles = await page.locator('.news-card h3 a, .news-hero-feature strong').allTextContents()
  assert.deepEqual(allEnVisibleTitles, [articleBilingual.translations.en.title])
  assert.equal(await page.locator('.news-hero-feature').getAttribute('href'), '/tin-tuc/2026-pac-seminar')
  assert.ok(allEnVisibleTitles.some(t => t.includes('2026 PAC Technical Seminar')), 'Authored EN article B must be visible')
  assert.ok(!allEnVisibleTitles.some(t => t.includes('Hội thảo đào tạo nội bộ')), 'VI-only article A must NOT be visible in EN list')
  assert.ok(!allEnVisibleTitles.some(t => t.includes('Bản tin di sản')), 'Legacy VI article D must NOT be visible in EN list')
  assert.ok(!allEnVisibleTitles.some(t => t.includes('Draft Project')), 'Draft article C must NOT be visible')
  assert.equal(pageErrors.length, 0)
  pass('T2: EN list — only authored EN visible')

  // =========================================================================
  // T3: EN empty list — no stale VI / no infinite loading
  // =========================================================================
  pageErrors.length = 0
  mockNews = [articleViOnly, articleLegacy] // Zero articles with authored EN
  await setLanguage('vi')
  await page.goto(`${origin}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
  assert.equal((await page.locator('.news-card h3 a, .news-hero-feature strong').allTextContents()).length, 2)
  await page.locator('.language-switch button:has-text("EN")').click()
  await page.waitForSelector('.empty-state')
  await page.waitForSelector('.news-list-section')

  const cardCountInEmptyEn = await page.locator('.news-card').count()
  assert.equal(cardCountInEmptyEn, 0, 'No stale VI cards should be rendered in empty EN list')
  assert.equal(await page.locator('.not-found').count(), 0, 'Should not render full 404 on list page')
  assert.equal(await page.locator('.empty-state').count(), 1, 'Explicit empty state displayed')
  assert.equal(await page.locator('.news-hero-feature').count(), 0, 'No stale VI feature')
  assert.equal(await page.locator('.news-result-count').textContent(), '0 posts')
  assert.ok(!(await page.locator('main').textContent()).includes('Loading'))
  await page.screenshot({ path: path.join(output, 'en-empty-list.png'), fullPage: true })
  assert.equal(pageErrors.length, 0)
  pass('T3: EN empty list — no stale VI / no infinite loading')

  // Restore full dataset
  mockNews = [articleViOnly, articleBilingual, articleDraftBilingual, articleLegacy]

  // =========================================================================
  // T4: Bilingual detail VI
  // =========================================================================
  pageErrors.length = 0
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  await page.goto(`${origin}/tin-tuc/hoi-thao-pac-2026`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-page')

  assert.equal(await page.locator('.article-header h1').textContent(), 'Hội thảo kỹ thuật PAC 2026')
  assert.equal(await page.locator('.article-header > p').textContent(), articleBilingual.translations.vi.shortDescription)
  assert.equal((await page.locator('.article-location').textContent()).trim(), articleBilingual.translations.vi.location)
  const viBodyText = await page.locator('.article-body').textContent()
  assert.ok(viBodyText.includes('Chuyên đề phân tích ASTM D86'))
  assert.ok(!viBodyText.includes('Authored English overview'), 'No EN block should leak into VI detail')
  assert.equal(pageErrors.length, 0)
  pass('T4: Bilingual detail VI')

  // =========================================================================
  // T5: Bilingual detail EN
  // =========================================================================
  pageErrors.length = 0
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/tin-tuc/2026-pac-seminar`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-page')

  assert.equal(await page.locator('.article-header h1').textContent(), '2026 PAC Technical Seminar')
  assert.equal(await page.locator('.article-header > p').textContent(), articleBilingual.translations.en.shortDescription)
  assert.equal((await page.locator('.article-location').textContent()).trim(), articleBilingual.translations.en.location)
  const enBodyText = await page.locator('.article-body').textContent()
  assert.ok(enBodyText.includes('Authored English overview paragraph'))
  assert.ok(!enBodyText.includes('Chuyên đề phân tích ASTM D86'), 'No VI block should leak into EN detail')
  await page.screenshot({ path: path.join(output, 'en-detail.png'), fullPage: true })
  // Empty/missing authored EN content must stay empty, including images/lists.
  for (const content of [{ version: 1, blocks: [] }, null, undefined]) {
    const emptyEn = structuredClone(articleBilingual)
    emptyEn.translations.en.content = content
    mockNews = [emptyEn]
    await page.goto(`${origin}/tin-tuc/2026-pac-seminar`, { waitUntil: 'networkidle' })
    assert.equal(await page.locator('.article-body > *').count(), 0, 'Empty EN must never borrow the VI tree')
    assert.equal(await page.locator('.article-header h1').textContent(), articleBilingual.translations.en.title)
  }
  mockNews = [articleViOnly, articleBilingual, articleDraftBilingual, articleLegacy]
  assert.equal(pageErrors.length, 0)
  pass('T5: Bilingual detail EN')

  // =========================================================================
  // T6: Divergent independent block trees
  // =========================================================================
  pageErrors.length = 0
  // Check VI DOM sequence
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  await page.goto(`${origin}/tin-tuc/hoi-thao-pac-2026`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  const viTags = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.article-body > *')).map(el => el.tagName)
  })
  // VI had: 1 heading (H2), 2 paragraph (P), 3 image (FIGURE), 4 paragraph (P), 5 quote (BLOCKQUOTE)
  assert.deepEqual(viTags, ['H2', 'P', 'FIGURE', 'P', 'BLOCKQUOTE'], 'VI block tree sequence matches authored VI')
  assert.deepEqual(await page.locator('.article-body > p').allTextContents(), articleBilingual.translations.vi.content.blocks.filter(b => b.type === 'paragraph').map(b => b.data.text))
  assert.equal(await page.locator('.article-body figure img').getAttribute('alt'), 'Hình ảnh thực tế')
  assert.equal(await page.locator('.article-body figure figcaption').textContent(), 'Thiết bị tại phòng thí nghiệm')

  // Check EN DOM sequence
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/tin-tuc/2026-pac-seminar`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  const enTags = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.article-body > *')).map(el => el.tagName)
  })
  // EN had: 1 paragraph (P), 2 bullet_list (UL), 3 heading (H3)
  assert.deepEqual(enTags, ['P', 'UL', 'H3'], 'EN block tree sequence matches authored EN independently')
  assert.equal(await page.locator('.article-body > p').textContent(), articleBilingual.translations.en.content.blocks[0].data.text)
  assert.deepEqual(await page.locator('.article-body ul li').allTextContents(), articleBilingual.translations.en.content.blocks[1].data.items)
  assert.equal(await page.locator('.article-body h3').textContent(), articleBilingual.translations.en.content.blocks[2].data.text)
  proof.contentTrees = [{ locale: 'vi', source: articleBilingual.translations.vi.content.blocks.map(b => b.type), dom: viTags }, { locale: 'en', source: articleBilingual.translations.en.content.blocks.map(b => b.type), dom: enTags }]
  assert.equal(pageErrors.length, 0)
  pass('T6: Divergent independent block trees')

  // =========================================================================
  // T7: Switch VI → EN changes slug
  // =========================================================================
  pageErrors.length = 0
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  await page.goto(`${origin}/tin-tuc/hoi-thao-pac-2026`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-header h1')

  // Click the EN button in Header
  const viBeforeSwitch = new URL(page.url()).pathname
  await page.locator('.language-switch button:has-text("EN")').click()
  await page.waitForURL('**/tin-tuc/2026-pac-seminar')

  assert.equal(new URL(page.url()).pathname, '/tin-tuc/2026-pac-seminar', 'URL must change to EN authored slug')
  assert.equal(await page.locator('.article-header h1').textContent(), '2026 PAC Technical Seminar')
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  proof.viToEn = { before: viBeforeSwitch, action: 'EN', after: new URL(page.url()).pathname }
  assert.equal(pageErrors.length, 0)
  pass('T7: Switch VI → EN changes slug')

  // =========================================================================
  // T8: Switch EN → VI changes slug
  // =========================================================================
  pageErrors.length = 0
  // Currently on /tin-tuc/2026-pac-seminar in EN mode. Click VI button.
  const enBeforeSwitch = new URL(page.url()).pathname
  await page.locator('.language-switch button:has-text("VI")').click()
  await page.waitForURL('**/tin-tuc/hoi-thao-pac-2026')

  assert.equal(new URL(page.url()).pathname, '/tin-tuc/hoi-thao-pac-2026', 'URL must change to VI authored slug')
  assert.equal(await page.locator('.article-header h1').textContent(), 'Hội thảo kỹ thuật PAC 2026')
  assert.equal(await page.locator('html').getAttribute('lang'), 'vi')
  proof.enToVi = { before: enBeforeSwitch, action: 'VI', after: new URL(page.url()).pathname }
  assert.equal(pageErrors.length, 0)
  pass('T8: Switch EN → VI changes slug')

  // =========================================================================
  // T9: VI-only article in EN → explicit unavailable state
  // =========================================================================
  pageErrors.length = 0
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/tin-tuc/hoi-thao-dao-tao-noi-bo`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-unavailable')

  const unavailText = await page.locator('.article-unavailable').textContent()
  assert.ok(unavailText.includes('This article is currently available in Vietnamese only.'), 'Must show explicit unavailable message')
  assert.ok(await page.locator('.article-unavailable button:has-text("Xem bản Tiếng Việt")').count() > 0, 'Must have button to view Vietnamese version')
  assert.equal(await page.locator('.article-body').count(), 0, 'Full VI body must NOT be rendered in EN')
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), 'LT VIETNAM', 'Unavailable is not a generic 404')
  assert.equal(await page.locator('.not-found h1').textContent(), 'This article is currently available in Vietnamese only.')
  await page.screenshot({ path: path.join(output, 'vi-only-unavailable.png'), fullPage: true })
  proof.unavailable = { heading: await page.locator('.not-found h1').textContent(), eyebrow: await page.locator('.not-found .eyebrow').textContent(), bodyCount: await page.locator('.article-body').count() }
  assert.equal(pageErrors.length, 0)
  pass('T9: VI-only article in EN → explicit unavailable state')

  // =========================================================================
  // T10: View Vietnamese version → correct language + slug
  // =========================================================================
  pageErrors.length = 0
  // Click "Xem bản Tiếng Việt"
  let navigationRequests = 0
  const countNavigation = request => { if (request.isNavigationRequest()) navigationRequests++ }
  page.on('request', countNavigation)
  await page.locator('.article-unavailable button:has-text("Xem bản Tiếng Việt")').click()
  await page.waitForURL('**/tin-tuc/hoi-thao-dao-tao-noi-bo')

  assert.equal(new URL(page.url()).pathname, '/tin-tuc/hoi-thao-dao-tao-noi-bo')
  await page.waitForSelector('.article-header h1')
  assert.equal(await page.locator('.article-header h1').textContent(), 'Hội thảo đào tạo nội bộ tiếng Việt')
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'vi', 'Language must switch to vi')
  assert.equal(await page.evaluate(() => localStorage.getItem('ltv-language')), 'vi')
  assert.equal(await page.locator('.article-body > p').textContent(), 'Nội dung chi tiết tiếng Việt duy nhất.')
  assert.equal(navigationRequests, 0, 'Vietnamese action uses client navigation, no reload loop')
  page.off('request', countNavigation)
  assert.equal(pageErrors.length, 0)
  pass('T10: View Vietnamese version → correct language + slug')

  // =========================================================================
  // T11: Unknown slug → true 404
  // =========================================================================
  pageErrors.length = 0
  await page.goto(`${origin}/tin-tuc/khong-he-ton-tai-tren-doi`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.not-found')

  assert.equal(await page.locator('.article-unavailable').count(), 0, 'Must NOT show unavailable message for nonexistent slug')
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  const notFoundHeading = await page.locator('.not-found h1').textContent()
  assert.ok(notFoundHeading.includes('Không tìm thấy bài viết') || notFoundHeading.includes('Article not found'), 'Shows genuine 404')
  await setLanguage('en')
  await page.goto(`${origin}/tin-tuc/khong-he-ton-tai-tren-doi`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  assert.equal(await page.locator('.not-found h1').textContent(), 'Article not found')
  assert.equal(await page.locator('.article-unavailable').count(), 0)
  await page.screenshot({ path: path.join(output, 'unknown-slug-404.png'), fullPage: true })
  assert.equal(pageErrors.length, 0)
  pass('T11: Unknown slug → true 404')

  // =========================================================================
  // T12: Draft bilingual → hidden
  // =========================================================================
  pageErrors.length = 0
  await setLanguage('vi')
  await page.goto(`${origin}/tin-tuc/du-an-dang-soan-thao`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.not-found')
  assert.equal(await page.locator('.article-unavailable').count(), 0)
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  await setLanguage('en')
  await page.goto(`${origin}/tin-tuc/draft-project-unreleased`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
  assert.equal(await page.locator('.article-unavailable, .article-body').count(), 0)
  for (const language of ['vi', 'en']) {
    await setLanguage(language)
    for (const draftSlug of ['du-an-dang-soan-thao', 'draft-project-unreleased']) {
      await page.goto(`${origin}/tin-tuc/${draftSlug}`, { waitUntil: 'networkidle' })
      assert.equal(await page.locator('.not-found .eyebrow').textContent(), '404')
      assert.equal(await page.locator('.article-unavailable, .article-body').count(), 0)
    }
  }
  assert.equal(pageErrors.length, 0)
  pass('T12: Draft bilingual → hidden')

  // =========================================================================
  // T13: Legacy response VI works / EN unavailable
  // =========================================================================
  pageErrors.length = 0
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  await page.goto(`${origin}/tin-tuc/ban-tin-di-san-khong-translations`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-header h1')
  assert.equal(await page.locator('.article-header h1').textContent(), 'Bản tin di sản không có translations')
  assert.equal(await page.locator('.article-header > p').textContent(), articleLegacy.shortDescription)
  assert.equal(await page.locator('.article-body > p').textContent(), articleLegacy.content.blocks[0].data.text)

  // Switch to EN on legacy article
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/tin-tuc/ban-tin-di-san-khong-translations`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-unavailable')
  assert.ok((await page.locator('.article-unavailable').textContent()).includes('This article is currently available in Vietnamese only.'))
  // Inline legacy EN values do not replace an authored translations.en record.
  const localizedLegacy = structuredClone(articleLegacy)
  localizedLegacy.content.blocks[0].data.text = { vi: 'Nội dung legacy VI object.', en: 'Legacy inline English must not grant article availability.' }
  mockNews = [localizedLegacy]
  await setLanguage('vi')
  await page.goto(`${origin}/tin-tuc/ban-tin-di-san-khong-translations`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.article-body > p').textContent(), 'Nội dung legacy VI object.')
  await page.locator('.language-switch button:has-text("EN")').click()
  await page.waitForSelector('.article-unavailable')
  assert.equal(await page.locator('.article-body').count(), 0)
  await page.goto(`${origin}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.news-card, .news-hero-feature').count(), 0)
  assert.equal(await page.locator('.empty-state').count(), 1)
  assert.equal(pageErrors.length, 0)
  pass('T13: Legacy response VI works / EN unavailable')

  // =========================================================================
  // T14: All QA-12 block types
  // =========================================================================
  pageErrors.length = 0
  const articleAllBlocks = {
    id: 'art-all-blocks',
    type: 'news',
    title: 'Bài viết đủ 6 loại block',
    slug: 'bai-viet-du-block',
    status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z',
    publishedAt: '2026-09-01T00:00:00.000Z',
    translations: {
      vi: {
        title: 'Bài viết đủ 6 loại block',
        slug: 'bai-viet-du-block',
        content: {
          version: 1,
          blocks: [
            { type: 'heading', data: { level: 4, text: 'H4 heading block' } },
            { type: 'paragraph', data: { text: 'Paragraph block' } },
            { type: 'bullet_list', data: { items: ['Bullet 1', 'Bullet 2'] } },
            { type: 'numbered_list', data: { items: ['Num 1', 'Num 2'] } },
            { type: 'image', data: { url: '/images/products/masoneilan-valve-21000.png', alt: 'Test img' } },
            { type: 'quote', data: { text: 'Quote block text', author: 'Author cite' } },
          ],
        },
      },
    },
  }
  mockNews = [articleAllBlocks]
  await setLanguage('vi')
  await page.goto(`${origin}/tin-tuc/bai-viet-du-block`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  assert.equal(await page.locator('.article-body h4').count(), 1)
  assert.equal(await page.locator('.article-body > p').count(), 1)
  assert.equal(await page.locator('.article-body ul').count(), 1)
  assert.equal(await page.locator('.article-body ol').count(), 1)
  assert.equal(await page.locator('.article-body figure img').count(), 1)
  assert.equal(await page.locator('.article-body blockquote').count(), 1)
  assert.equal(await page.locator('.article-body ul').textContent(), 'Bullet 1Bullet 2')
  assert.deepEqual(await page.locator('.article-body ol li').allTextContents(), ['Num 1', 'Num 2'])
  assert.equal(await page.locator('.article-body blockquote p').textContent(), 'Quote block text')
  assert.equal(await page.locator('.article-body cite').textContent(), '— Author cite')
  assert.equal(await page.locator('.article-body figure img').getAttribute('alt'), 'Test img')
  const enAllBlocks = structuredClone(articleAllBlocks)
  enAllBlocks.translations.en = {
    title: 'Authored EN all blocks', slug: 'authored-en-all-blocks',
    content: {
      version: 1,
      blocks: [
        { type: 'heading', data: { level: 4, text: 'EN heading' } },
        { type: 'paragraph', data: { text: 'EN paragraph' } },
        { type: 'bullet_list', data: { items: ['EN bullet 1', 'EN bullet 2'] } },
        { type: 'numbered_list', data: { items: ['EN number 1', 'EN number 2'] } },
        { type: 'image', data: { url: '/images/hero/portfolio-hero-v5.png', alt: 'EN alt', caption: 'EN caption' } },
        { type: 'quote', data: { text: 'EN quote', author: 'EN author' } },
      ],
    },
  }
  mockNews = [enAllBlocks]
  await setLanguage('en')
  await page.goto(`${origin}/tin-tuc/authored-en-all-blocks`, { waitUntil: 'networkidle' })
  assert.deepEqual(await page.locator('.article-body').evaluate(el => Array.from(el.children, child => child.tagName)), ['H4', 'P', 'UL', 'OL', 'FIGURE', 'BLOCKQUOTE'])
  assert.equal(await page.locator('.article-body h4').textContent(), 'EN heading')
  assert.equal(await page.locator('.article-body > p').textContent(), 'EN paragraph')
  assert.deepEqual(await page.locator('.article-body ul li').allTextContents(), ['EN bullet 1', 'EN bullet 2'])
  assert.deepEqual(await page.locator('.article-body ol li').allTextContents(), ['EN number 1', 'EN number 2'])
  assert.equal(await page.locator('.article-body figure img').getAttribute('src'), '/images/hero/portfolio-hero-v5.png')
  assert.equal(await page.locator('.article-body figure img').getAttribute('alt'), 'EN alt')
  assert.equal(await page.locator('.article-body figcaption').textContent(), 'EN caption')
  assert.equal(await page.locator('.article-body blockquote p').textContent(), 'EN quote')
  assert.equal(await page.locator('.article-body cite').textContent(), '— EN author')
  assert.equal(pageErrors.length, 0)
  pass('T14: All QA-12 block types')

  // =========================================================================
  // T15: Malformed/unknown block skip-safe
  // =========================================================================
  pageErrors.length = 0
  const articleMalformed = {
    id: 'art-malformed',
    type: 'news',
    title: 'Bài viết chứa block lỗi',
    slug: 'bai-viet-block-loi',
    status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z',
    publishedAt: '2026-09-01T00:00:00.000Z',
    translations: {
      vi: {
        title: 'Bài viết chứa block lỗi',
        slug: 'bai-viet-block-loi',
        content: {
          version: 1,
          blocks: [
            null,
            42,
            {},
            { type: 'weird_alien_widget', data: {} },
            { type: 'paragraph', data: null },
            { type: 'heading', data: { text: { unexpected: 'invalid' } } },
            { type: 'paragraph', data: { text: ['invalid array'] } },
            { type: 'quote', data: { text: 99 } },
            { type: 'bullet_list', data: { items: [null, {}, 42] } },
            { type: 'numbered_list', data: { items: 'invalid' } },
            { type: 'image', data: { url: 'javascript:alert(1)' } },
            { type: 'paragraph', data: { text: 'Đoạn văn an toàn' } },
          ],
        },
      },
    },
  }
  mockNews = [articleMalformed]
  await setLanguage('vi')
  await page.goto(`${origin}/tin-tuc/bai-viet-block-loi`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-body')

  assert.equal(await page.locator('.article-body p').textContent(), 'Đoạn văn an toàn')
  assert.equal(await page.locator('.article-body figure').count(), 0)
  assert.equal(await page.locator('.article-body ul, .article-body ol, .article-body blockquote').count(), 0)
  const malformedEn = structuredClone(articleMalformed)
  malformedEn.translations.en = { ...structuredClone(articleMalformed.translations.vi), title: 'Malformed EN blocks', slug: 'malformed-en-blocks' }
  malformedEn.translations.en.content.blocks.at(-1).data.text = 'SAFE EN AUTHORED TEXT'
  mockNews = [malformedEn]
  await setLanguage('en')
  await page.goto(`${origin}/tin-tuc/malformed-en-blocks`, { waitUntil: 'networkidle' })
  assert.deepEqual(await page.locator('.article-body').evaluate(el => Array.from(el.children, child => child.tagName)), ['H2', 'P'])
  assert.equal(await page.locator('.article-body > p').textContent(), 'SAFE EN AUTHORED TEXT')
  assert.equal(pageErrors.length, 0)
  pass('T15: Malformed/unknown block skip-safe')

  // =========================================================================
  // T16: About VI
  // =========================================================================
  pageErrors.length = 0
  const caseStudyItem = {
    id: 'cs-01',
    slug: 'hoi-thao-van-an-toan',
    type: 'event',
    title: 'Hội thảo van an toàn',
    status: 'published',
    createdAt: '2026-05-15T00:00:00.000Z',
    publishedAt: '2026-05-15T00:00:00.000Z',
    thumbnailImage: { publicUrl: '/images/hero/portfolio-hero-v5.png', altText: 'CS' },
    translations: {
      vi: {
        title: 'Hội thảo van an toàn',
        slug: 'hoi-thao-van-an-toan',
        shortDescription: 'Case study thực tế',
        content: {
          version: 1,
          blocks: [{ type: 'paragraph', data: { text: 'Nội dung bối cảnh case study VI' } }],
        },
      },
    },
  }
  mockNews = [caseStudyItem]
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.about-case-study-section')

  assert.ok((await page.locator('.about-case-study-section').textContent()).includes('Hội thảo van an toàn'))
  assert.deepEqual(await page.locator('.case-study-facts dd').allTextContents(), ['Nội dung bối cảnh case study VI'])
  const authoredCase = structuredClone(caseStudyItem)
  authoredCase.translations.en = {
    title: 'Authored Safety Valve Case Study', slug: 'authored-safety-valve-case-study', shortDescription: 'Authored EN summary.',
    content: { version: 1, blocks: ['Authored context.', 'Authored value.', 'Authored approach.'].map(text => ({ type: 'paragraph', data: { text } })) },
  }
  mockNews = [authoredCase]
  await setLanguage('en')
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('#case-study-title').textContent(), authoredCase.translations.en.title)
  assert.equal(await page.locator('.case-study-lead').textContent(), 'Authored EN summary.')
  assert.deepEqual(await page.locator('.case-study-facts dd').allTextContents(), ['Authored context.', 'Authored approach.', 'Authored value.'])
  assert.equal(await page.locator('.case-study-copy a').getAttribute('href'), '/tin-tuc/authored-safety-valve-case-study')
  authoredCase.translations.en.content = { version: 1, blocks: [] }
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.case-study-facts').count(), 0, 'No VI facts borrowed when authored EN tree is empty')
  assert.equal(await page.locator('#case-study-title').textContent(), authoredCase.translations.en.title)
  assert.equal(pageErrors.length, 0)
  pass('T16: About VI')

  // =========================================================================
  // T17: About EN without translation — no crash/no fake EN
  // =========================================================================
  pageErrors.length = 0
  mockNews = [caseStudyItem]
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/gioi-thieu`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.page-intro-about')

  // Case study has no EN translation -> must be conditionally omitted
  assert.equal(await page.locator('.about-case-study-section').count(), 0, 'Case study omitted in EN when no EN translation exists')
  assert.equal(pageErrors.length, 0)
  pass('T17: About EN without translation — no crash/no fake EN')

  // =========================================================================
  // T18: Home EN only authored EN
  // =========================================================================
  pageErrors.length = 0
  mockNews = [articleViOnly, articleBilingual]
  await setLanguage('vi')
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.home-news-section')
  assert.deepEqual(await page.locator('.home-news-grid .news-card h3 a').allTextContents(), [articleViOnly.title, articleBilingual.title])
  await page.locator('.language-switch button:has-text("EN")').click()

  const homeCards = await page.locator('.home-news-grid .news-card h3 a').allTextContents()
  assert.equal(homeCards.length, 1, 'Only bilingual article B should appear on Home EN')
  assert.ok(homeCards[0].includes('2026 PAC Technical Seminar'))
  assert.equal(await page.locator('.home-news-grid h3 a').getAttribute('href'), '/tin-tuc/2026-pac-seminar')
  assert.equal(await page.locator('.home-news-grid .news-card-body p').textContent(), articleBilingual.translations.en.shortDescription)
  assert.equal(pageErrors.length, 0)
  pass('T18: Home EN only authored EN')

  // =========================================================================
  // T19: Home empty EN state
  // =========================================================================
  pageErrors.length = 0
  mockNews = [articleViOnly]
  await setLanguage('vi')
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.home-news-section')
  assert.equal(await page.locator('.home-news-grid .news-card').count(), 1)
  await page.locator('.language-switch button:has-text("EN")').click()

  const homeCardsEmpty = await page.locator('.home-news-grid .news-card').count()
  assert.equal(homeCardsEmpty, 0, 'Home news grid is empty without stale cards')
  // Also verify EN data -> EN empty through the actual focus-refetch mechanism.
  mockNews = [articleBilingual]
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.home-news-grid .news-card').count(), 1)
  mockNews = [articleViOnly]
  await Promise.all([
    page.waitForResponse(res => res.url() === origin + '/api/news-events'),
    page.evaluate(() => window.dispatchEvent(new Event('focus'))),
  ])
  await page.waitForFunction(() => document.querySelectorAll('.home-news-grid .news-card').length === 0)
  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport)
    assert.equal(await page.locator('.home-news-section').isVisible(), true)
    assert.equal(await page.locator('.home-contact-cta').isVisible(), true)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow')
    await page.screenshot({ path: path.join(output, `en-empty-home-${viewport.width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  assert.equal(pageErrors.length, 0)
  pass('T19: Home empty EN state')

  // =========================================================================
  // T20: Unique unseen VI string never synthesized into EN
  // =========================================================================
  pageErrors.length = 0
  const uniqueViPhrase = 'Cụm chiết quang siêu dẫn 9999 chưa từng tồn tại trong từ điển'
  const articleUnique = {
    id: 'art-unique-01',
    type: 'news',
    title: uniqueViPhrase,
    slug: 'cum-chiet-quang-sieu-dan',
    status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z',
    publishedAt: '2026-09-01T00:00:00.000Z',
    translations: {
      vi: {
        title: uniqueViPhrase,
        slug: 'cum-chiet-quang-sieu-dan',
        content: { version: 1, blocks: [{ type: 'paragraph', data: { text: uniqueViPhrase } }] },
      },
    },
  }
  mockNews = [articleUnique]
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })

  // Must not appear in listing
  assert.equal(await page.locator(`.news-card:has-text("${uniqueViPhrase}")`).count(), 0)
  assert.equal(await page.locator('.news-card, .news-hero-feature').count(), 0)

  // Direct visit to slug in EN -> unavailable state
  await page.goto(`${origin}/tin-tuc/cum-chiet-quang-sieu-dan`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.article-unavailable')
  assert.equal(await page.locator(`p:has-text("${uniqueViPhrase}")`).count(), 0, 'Unique VI string is not rendered in EN mode')
  assert.ok(!(await page.locator('main').textContent()).includes(uniqueViPhrase))
  assert.equal(pageErrors.length, 0)
  pass('T20: Unique unseen VI string never synthesized into EN')

  // =========================================================================
  // T21: Search/filter cannot reintroduce VI-only article into EN
  // =========================================================================
  pageErrors.length = 0
  mockNews = [articleViOnly, articleBilingual]
  await page.evaluate(() => localStorage.setItem('ltv-language', 'en'))
  await page.goto(`${origin}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.news-filter')

  // Click various filter buttons: 'all', 'news', 'event', 'project'
  const filterButtons = await page.locator('.news-filter button').all()
  assert.equal(filterButtons.length, 4)
  assert.equal(await page.locator('main input[type="search"], main input[type="text"]').count(), 0, 'NewsPage has no search input; type filters and reset are exercised')
  for (const [index, btn] of filterButtons.entries()) {
    await btn.click()
    const currentTitles = await page.locator('.news-card h3 a').allTextContents()
    assert.deepEqual(currentTitles, index === 2 ? [articleBilingual.translations.en.title] : [])
    if (index === 2) assert.equal(await page.locator('.news-card-body p').textContent(), articleBilingual.translations.en.shortDescription)
    assert.ok(!currentTitles.some(t => t.includes('Hội thảo đào tạo nội bộ')), 'VI-only article must NEVER appear under any filter tab in EN')
    assert.equal(await page.locator('.news-hero-feature strong').textContent(), articleBilingual.translations.en.title)
    if (index !== 2) {
      await page.locator('.empty-state button').click()
      assert.equal(await filterButtons[0].getAttribute('aria-pressed'), 'true')
      assert.deepEqual(await page.locator('.news-card h3 a, .news-hero-feature strong').allTextContents(), [articleBilingual.translations.en.title])
    }
  }
  proof.search = 'NewsPage has no search input. All 4 type filters and reset tested against authored EN dataset.'
  assert.equal(pageErrors.length, 0)
  pass('T21: Search/filter cannot reintroduce VI-only article into EN')

  // =========================================================================
  // T22: html.lang matches selected language
  // =========================================================================
  pageErrors.length = 0
  await page.evaluate(() => localStorage.setItem('ltv-language', 'vi'))
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' })
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'vi')

  await page.locator('.language-switch button:has-text("EN")').click()
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en')
  assert.equal(await page.evaluate(() => localStorage.getItem('ltv-language')), 'en')

  await page.locator('.language-switch button:has-text("VI")').click()
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'vi')
  assert.equal(await page.evaluate(() => localStorage.getItem('ltv-language')), 'vi')
  assert.equal(pageErrors.length, 0)
  pass('T22: html.lang matches selected language')

  console.log('\n=== ALL 22 QA-14C4 PUBLIC BILINGUAL BROWSER TESTS PASSED ===')
} finally {
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ suite: 'QA-14C4 public authored VI/EN', passed: results.length, total: 22, results, proof, migration: 'NOT EXECUTED', api: 'mock only', pageErrors }, null, 2) + '\n')
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
