import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.PHASE1_SCREENSHOT_DIR ?? os.tmpdir()
const browser = await chromium.launch({ headless: true })
const failures = []

async function capture(name, viewport, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport })
  await page.emulateMedia({ reducedMotion })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('h1').waitFor()
  await page.waitForTimeout(700)

  const metrics = await page.evaluate(() => {
    const hero = document.querySelector('.home-hero')
    const heading = document.querySelector('.home-hero h1')
    const headingStyle = heading ? getComputedStyle(heading) : null
    const headingHeight = heading?.getBoundingClientRect().height ?? 0
    const lineHeight = headingStyle ? Number.parseFloat(headingStyle.lineHeight) : 0
    const footer = document.querySelector('.site-footer')

    return {
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      trustAfterHero: hero?.nextElementSibling?.matches('.home-trust-strip') ?? false,
      progressBars: document.querySelectorAll('.site-scroll-progress').length,
      newsCards: document.querySelectorAll('.home-news-grid > .news-card').length,
      footerGroups: document.querySelectorAll('.footer-group').length,
      openFooterGroups: document.querySelectorAll('.footer-group[open]').length,
      footerHeight: Math.round(footer?.getBoundingClientRect().height ?? 0),
      heroHeadingLines: lineHeight > 0 ? Math.round(headingHeight / lineHeight) : 0,
      heroActionsBottom: Math.round(document.querySelector('.hero-actions')?.getBoundingClientRect().bottom ?? 0),
      viewportHeight: window.innerHeight,
      pageHeight: document.documentElement.scrollHeight,
    }
  })

  await page.evaluate(async () => {
    const delay = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration))
    document.querySelectorAll('img').forEach((image) => {
      image.loading = 'eager'
    })
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.8) {
      window.scrollTo(0, y)
      await delay(60)
    }
    window.scrollTo(0, 0)
    await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => undefined)))
  })
  await page.waitForTimeout(300)

  const screenshotPath = path.join(outputDir, `ltvn-phase1-${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await page.close()
  return { screenshotPath, metrics }
}

const desktop = await capture('desktop', { width: 1440, height: 900 })
const mobile = await capture('mobile', { width: 375, height: 812 })
const landscape = await capture('landscape', { width: 844, height: 390 })
const reduced = await capture('reduced-motion', { width: 1440, height: 900 }, 'reduce')

for (const [name, result] of Object.entries({ desktop, mobile, landscape, reduced })) {
  if (result.metrics.horizontalOverflow) failures.push(`${name}: tràn ngang`)
  if (!result.metrics.trustAfterHero) failures.push(`${name}: trust strip chưa nằm ngay sau hero`)
  if (result.metrics.progressBars !== 0) failures.push(`${name}: còn scroll progress cũ`)
  if (result.metrics.newsCards !== 3) failures.push(`${name}: số bài tin tức không bằng 3`)
  if (result.metrics.footerGroups !== 3) failures.push(`${name}: footer không có đủ 3 nhóm`)
}

if (desktop.metrics.heroHeadingLines > 2) failures.push(`desktop: tiêu đề hero chiếm ${desktop.metrics.heroHeadingLines} dòng`)
if (desktop.metrics.heroActionsBottom > desktop.metrics.viewportHeight) failures.push('desktop: CTA hero nằm dưới màn hình đầu tiên')
if (landscape.metrics.heroActionsBottom > landscape.metrics.viewportHeight) failures.push('landscape: CTA hero nằm dưới màn hình đầu tiên')
if (mobile.metrics.openFooterGroups !== 0) failures.push('mobile: footer chưa thu gọn mặc định')
if (mobile.metrics.footerHeight > 680) failures.push(`mobile: footer còn quá dài (${mobile.metrics.footerHeight}px)`)

await browser.close()

console.log(JSON.stringify({ desktop, mobile, landscape, reduced }, null, 2))

if (failures.length) {
  console.error('Kiểm tra trực quan giai đoạn 1 không đạt:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Kiểm tra trực quan giai đoạn 1 đạt.')
