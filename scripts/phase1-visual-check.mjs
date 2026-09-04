import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.PHASE1_SCREENSHOT_DIR ?? os.tmpdir()
const browser = await chromium.launch({ headless: true })
const failures = []

async function capture(name, viewport, reducedMotion = 'no-preference', language = 'vi') {
  const page = await browser.newPage({ viewport })
  await page.emulateMedia({ reducedMotion })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  if (language === 'en') {
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await page.locator('html[lang="en"]').waitFor()
  }
  await page.locator('h1').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)

  const metrics = await page.evaluate(() => {
    const hero = document.querySelector('.home-hero')
    const heading = document.querySelector('.home-hero h1')
    const headingStyle = heading ? getComputedStyle(heading) : null
    const headingHeight = heading?.getBoundingClientRect().height ?? 0
    const lineHeight = headingStyle ? Number.parseFloat(headingStyle.lineHeight) : 0
    const footer = document.querySelector('.site-footer')
    const trustStrip = document.querySelector('.home-trust-strip')
    const trustGrid = document.querySelector('.home-trust-grid')
    const heroRect = hero?.getBoundingClientRect()
    const trustRect = trustStrip?.getBoundingClientRect()
    const trustGridRect = trustGrid?.getBoundingClientRect()
    const heroActionsRect = document.querySelector('.hero-actions')?.getBoundingClientRect()
    const firstSectionRect = document.querySelector('.home-solution-section')?.getBoundingClientRect()
    const skipLink = document.querySelector('.skip-link')
    const skipLinkRect = skipLink?.getBoundingClientRect()

    return {
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      trustAfterHero: hero?.nextElementSibling?.matches('.home-trust-strip') ?? false,
      progressBars: document.querySelectorAll('.site-scroll-progress').length,
      newsCards: document.querySelectorAll('.home-news-grid > .news-card').length,
      footerGroups: document.querySelectorAll('.footer-group').length,
      visibleFooterBodies: Array.from(document.querySelectorAll('.footer-group > .footer-links, .footer-group > .footer-contact'))
        .filter((element) => getComputedStyle(element).display !== 'none').length,
      footerHeight: Math.round(footer?.getBoundingClientRect().height ?? 0),
      heroHeadingLines: lineHeight > 0 ? Math.round(headingHeight / lineHeight) : 0,
      heroActionsBottom: Math.round(heroActionsRect?.bottom ?? 0),
      firstSectionTop: Math.round(firstSectionRect?.top ?? 0),
      heroHeight: Math.round(heroRect?.height ?? 0),
      trustOverlap: Math.round((heroRect?.bottom ?? 0) - (trustRect?.top ?? 0)),
      trustActionClearance: Math.round((trustGridRect?.top ?? 0) - (heroActionsRect?.bottom ?? 0)),
      viewportHeight: window.innerHeight,
      pageHeight: document.documentElement.scrollHeight,
      language: document.documentElement.lang,
      localFontLoaded: document.fonts.check('16px "Plus Jakarta Sans"'),
      bodyFontFamily: getComputedStyle(document.body).fontFamily,
      skipLinkFocused: document.activeElement === skipLink,
      skipLinkTransform: skipLink ? getComputedStyle(skipLink).transform : '',
      skipLinkBottom: Math.round(skipLinkRect?.bottom ?? 0),
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
const laptop = await capture('laptop', { width: 1366, height: 768 })
const mobile = await capture('mobile', { width: 375, height: 812 })
const landscape = await capture('landscape', { width: 844, height: 390 })
const reduced = await capture('reduced-motion', { width: 1440, height: 900 }, 'reduce')
const desktopEn = await capture('desktop-en', { width: 1440, height: 900 }, 'no-preference', 'en')
const mobileEn = await capture('mobile-en', { width: 375, height: 812 }, 'no-preference', 'en')

for (const [name, result] of Object.entries({ desktop, laptop, mobile, landscape, reduced, desktopEn, mobileEn })) {
  if (result.metrics.horizontalOverflow) failures.push(`${name}: tràn ngang`)
  if (!result.metrics.trustAfterHero) failures.push(`${name}: trust strip chưa nằm ngay sau hero`)
  if (result.metrics.progressBars !== 0) failures.push(`${name}: còn scroll progress cũ`)
  if (result.metrics.newsCards !== 3) failures.push(`${name}: số bài tin tức không bằng 3`)
  if (result.metrics.footerGroups !== 3) failures.push(`${name}: footer không có đủ 3 nhóm`)
  if (result.metrics.visibleFooterBodies !== 3) failures.push(`${name}: nội dung footer còn bị ẩn`)
  if (result.metrics.trustOverlap < 16) failures.push(`${name}: trust strip chưa được kéo lên hero`)
  if (result.metrics.trustActionClearance < 12) failures.push(`${name}: trust strip che hoặc nằm quá sát CTA hero`)
  if (!result.metrics.localFontLoaded) failures.push(`${name}: font self-host chưa tải`)
}

if (desktop.metrics.heroHeadingLines > 2) failures.push(`desktop: tiêu đề hero chiếm ${desktop.metrics.heroHeadingLines} dòng`)
if (desktop.metrics.heroActionsBottom > desktop.metrics.viewportHeight) failures.push('desktop: CTA hero nằm dưới màn hình đầu tiên')
if (laptop.metrics.firstSectionTop > laptop.metrics.viewportHeight) failures.push('laptop: nội dung sau hero chưa xuất hiện trong màn hình đầu tiên')
if (desktopEn.metrics.heroHeadingLines > 2) failures.push(`desktop-en: tiêu đề hero chiếm ${desktopEn.metrics.heroHeadingLines} dòng`)
if (desktopEn.metrics.heroActionsBottom > desktopEn.metrics.viewportHeight) failures.push('desktop-en: CTA hero nằm dưới màn hình đầu tiên')
if (landscape.metrics.heroActionsBottom > landscape.metrics.viewportHeight) failures.push('landscape: CTA hero nằm dưới màn hình đầu tiên')
if (mobile.metrics.firstSectionTop > mobile.metrics.viewportHeight) failures.push('mobile: nội dung sau trust strip chưa xuất hiện trong màn hình đầu tiên')
if (mobile.metrics.footerHeight > 900) failures.push(`mobile: footer còn quá dài (${mobile.metrics.footerHeight}px)`)

await browser.close()

console.log(JSON.stringify({ desktop, laptop, mobile, landscape, reduced, desktopEn, mobileEn }, null, 2))

if (failures.length) {
  console.error('Kiểm tra trực quan giai đoạn 1 không đạt:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Kiểm tra trực quan giai đoạn 1 đạt.')
