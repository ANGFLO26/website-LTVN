import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.PHASE2_SCREENSHOT_DIR ?? os.tmpdir()
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const failures = []
const browserErrors = []

page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text())
})
page.on('pageerror', (error) => browserErrors.push(error.message))

const hasHorizontalOverflow = () => page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
)

const loadImages = () => page.locator('img').evaluateAll(async (images) => {
  images.forEach((image) => {
    image.loading = 'eager'
  })
  await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
})

const getCatalogImageMetrics = () => page.locator('.product-image-link img').evaluateAll((images) =>
  images.map((image) => {
    const imageRect = image.getBoundingClientRect()
    const frame = image.parentElement
    const frameRect = frame?.getBoundingClientRect()
    const frameStyle = frame ? getComputedStyle(frame) : null
    return {
      loaded: image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
      fullyInside: Boolean(frameRect)
        && imageRect.left >= frameRect.left
        && imageRect.right <= frameRect.right
        && imageRect.top >= frameRect.top
        && imageRect.bottom <= frameRect.bottom,
      transparentFrame: frameStyle?.backgroundImage === 'none'
        && frameStyle.backgroundColor === 'rgba(0, 0, 0, 0)',
      objectFit: getComputedStyle(image).objectFit,
    }
  }),
)

await page.goto(`${baseUrl}/pac`, { waitUntil: 'networkidle' })
await loadImages()

const desktopCatalogIntroHeight = await page.locator('.catalog-page-intro').evaluate((element) =>
  Math.round(element.getBoundingClientRect().height),
)
const catalogCardCount = await page.locator('.product-card').count()
const catalogFactCount = await page.locator('.product-card-facts > div').count()
const pacDesktopImages = await getCatalogImageMetrics()
if (catalogCardCount !== 6) failures.push(`/pac desktop: có ${catalogCardCount} card, cần 6`)
if (catalogFactCount !== catalogCardCount * 2) {
  failures.push(`/pac desktop: metadata card có ${catalogFactCount} hàng, cần ${catalogCardCount * 2}`)
}
if (desktopCatalogIntroHeight > 340) failures.push(`/pac desktop: hero danh mục còn quá cao (${desktopCatalogIntroHeight}px)`)
if (pacDesktopImages.some((image) => !image.loaded || !image.fullyInside || !image.transparentFrame || image.objectFit !== 'contain')) {
  failures.push('/pac desktop: ảnh sản phẩm còn nền khung, bị cắt hoặc không dùng chế độ contain')
}

const unloadedCatalogImages = await page.locator('.product-image-link img').evaluateAll((images) =>
  images.filter((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0).length,
)
if (unloadedCatalogImages > 0) failures.push(`/pac desktop: ${unloadedCatalogImages} ảnh sản phẩm không tải được`)

const imageFrameRatios = await page.locator('.product-image-link').evaluateAll((elements) =>
  elements.map((element) => {
    const rect = element.getBoundingClientRect()
    return rect.width / rect.height
  }),
)
if (imageFrameRatios.some((ratio) => ratio < 1.32 || ratio > 1.35)) {
  failures.push('/pac desktop: khung ảnh sản phẩm chưa đồng nhất tỷ lệ 4:3')
}

const desktopMobileFiltersDisplay = await page.locator('.catalog-mobile-filters').evaluate((element) =>
  getComputedStyle(element).display,
)
if (desktopMobileFiltersDisplay !== 'none') failures.push('/pac desktop: bộ lọc mobile đang hiển thị')
if (await hasHorizontalOverflow()) failures.push('/pac desktop: giao diện bị tràn ngang')

await page.getByPlaceholder('Tìm theo tên thiết bị, model hoặc tiêu chuẩn').fill('ASTM D5191')
await page.waitForTimeout(100)
const standardSearchCount = await page.locator('.product-card').count()
if (standardSearchCount !== 1) failures.push(`/pac: tìm ASTM D5191 trả về ${standardSearchCount} sản phẩm, cần 1`)
await page.getByRole('button', { name: 'Xóa nội dung tìm kiếm' }).click()

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase2-catalog-desktop.png'),
  fullPage: true,
})

await page.goto(`${baseUrl}/baker-hughes`, { waitUntil: 'networkidle' })
await loadImages()
const bakerDesktopCards = await page.locator('.product-card').count()
const bakerDesktopImages = await getCatalogImageMetrics()
if (bakerDesktopCards !== 7) failures.push(`/baker-hughes desktop: có ${bakerDesktopCards} card, cần 7`)
if (bakerDesktopImages.some((image) => !image.loaded || !image.fullyInside || !image.transparentFrame || image.objectFit !== 'contain')) {
  failures.push('/baker-hughes desktop: ảnh sản phẩm còn nền khung, bị cắt hoặc không dùng chế độ contain')
}
if (await hasHorizontalOverflow()) failures.push('/baker-hughes desktop: giao diện bị tràn ngang')

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase2-baker-desktop.png'),
  fullPage: true,
})

await page.setViewportSize({ width: 375, height: 812 })
await page.goto(`${baseUrl}/pac`, { waitUntil: 'networkidle' })
await loadImages()

const mobileFiltersDisplay = await page.locator('.catalog-mobile-filters').evaluate((element) =>
  getComputedStyle(element).display,
)
const desktopCategoryDisplay = await page.locator('.catalog-category-strip').evaluate((element) =>
  getComputedStyle(element).display,
)
const mobileSelectCount = await page.locator('.catalog-mobile-filters select').count()
if (mobileFiltersDisplay !== 'grid') failures.push('/pac mobile: bộ lọc mobile chưa hiển thị dạng grid')
if (desktopCategoryDisplay !== 'none') failures.push('/pac mobile: chip danh mục desktop vẫn còn hiển thị')
if (mobileSelectCount !== 2) failures.push(`/pac mobile: có ${mobileSelectCount} ô lọc, cần 2`)

const mobileControlHeights = await page.locator('.catalog-mobile-filters select, .catalog-clear-button').evaluateAll((elements) =>
  elements.filter((element) => getComputedStyle(element).display !== 'none')
    .map((element) => Math.round(element.getBoundingClientRect().height)),
)
if (mobileControlHeights.some((height) => height < 40)) failures.push('/pac mobile: vùng chạm bộ lọc quá nhỏ')

await page.locator('.catalog-mobile-filters select').nth(0).selectOption('Herzog')
await page.locator('.catalog-mobile-filters select').nth(1).selectOption('Chưng cất')
const filteredMobileCount = await page.locator('.product-card').count()
if (filteredMobileCount !== 1) failures.push(`/pac mobile: lọc Herzog + Chưng cất trả về ${filteredMobileCount}, cần 1`)
await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
const clearedMobileCount = await page.locator('.product-card').count()
if (clearedMobileCount !== 6) failures.push(`/pac mobile: xóa lọc còn ${clearedMobileCount} sản phẩm, cần 6`)
if (await hasHorizontalOverflow()) failures.push('/pac mobile: giao diện bị tràn ngang')
const pacMobileImages = await getCatalogImageMetrics()
if (pacMobileImages.some((image) => !image.loaded || !image.fullyInside || !image.transparentFrame || image.objectFit !== 'contain')) {
  failures.push('/pac mobile: ảnh sản phẩm còn nền khung, bị cắt hoặc không dùng chế độ contain')
}

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase2-catalog-mobile.png'),
  fullPage: true,
})

await page.goto(`${baseUrl}/baker-hughes`, { waitUntil: 'networkidle' })
await loadImages()
const bakerMobileImages = await getCatalogImageMetrics()
if (bakerMobileImages.some((image) => !image.loaded || !image.fullyInside || !image.transparentFrame || image.objectFit !== 'contain')) {
  failures.push('/baker-hughes mobile: ảnh sản phẩm còn nền khung, bị cắt hoặc không dùng chế độ contain')
}
if (await hasHorizontalOverflow()) failures.push('/baker-hughes mobile: giao diện bị tràn ngang')

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase2-baker-mobile.png'),
  fullPage: true,
})

await page.setViewportSize({ width: 1440, height: 900 })
await page.goto(`${baseUrl}/san-pham/optidist`, { waitUntil: 'networkidle' })
await loadImages()

const desktopProductHeroHeight = await page.locator('.product-detail-hero').evaluate((element) =>
  Math.round(element.getBoundingClientRect().height),
)
const applicationTags = await page.locator('.product-facts > div').nth(1).locator('.product-fact-tags li').count()
const standardTags = await page.locator('.product-standard-tags li').count()
const consultationLinks = await page.locator('a[href="/lien-he?san-pham=optidist"]').count()
const consultationCtaVisible = await page.locator('.product-consultation-cta').isVisible()
const desktopGalleryRatio = await page.locator('.product-gallery-stage').evaluate((element) => {
  const rect = element.getBoundingClientRect()
  return rect.width / rect.height
})
const desktopGalleryImage = await page.locator('.product-gallery-stage img').evaluate((image) => {
  const imageRect = image.getBoundingClientRect()
  const frame = image.parentElement
  const frameRect = frame?.getBoundingClientRect()
  const frameStyle = frame ? getComputedStyle(frame) : null
  return {
    fullyInside: Boolean(frameRect)
      && imageRect.left >= frameRect.left
      && imageRect.right <= frameRect.right
      && imageRect.top >= frameRect.top
      && imageRect.bottom <= frameRect.bottom,
    transparentFrame: frameStyle?.backgroundImage === 'none'
      && frameStyle.backgroundColor === 'rgba(0, 0, 0, 0)',
  }
})
if (applicationTags !== 3) failures.push(`/san-pham/optidist: có ${applicationTags} tag ứng dụng, cần 3`)
if (standardTags !== 3) failures.push(`/san-pham/optidist: có ${standardTags} tag tiêu chuẩn, cần 3`)
if (consultationLinks !== 2) failures.push(`/san-pham/optidist: có ${consultationLinks} CTA tư vấn, cần 2`)
if (!consultationCtaVisible) failures.push('/san-pham/optidist: CTA tư vấn cuối trang chưa hiển thị')
if (desktopProductHeroHeight > 700) failures.push(`/san-pham/optidist desktop: hero sản phẩm còn quá cao (${desktopProductHeroHeight}px)`)
if (desktopGalleryRatio < 0.99 || desktopGalleryRatio > 1.01) {
  failures.push(`/san-pham/optidist desktop: khung ảnh có tỷ lệ ${desktopGalleryRatio.toFixed(2)}, cần 1:1`)
}
if (!desktopGalleryImage.fullyInside || !desktopGalleryImage.transparentFrame) {
  failures.push('/san-pham/optidist desktop: ảnh chi tiết còn nền khung hoặc bị cắt')
}
if (await hasHorizontalOverflow()) failures.push('/san-pham/optidist desktop: giao diện bị tràn ngang')

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase2-product-desktop.png'),
  fullPage: true,
})

await page.goto(`${baseUrl}/lien-he?san-pham=optidist`, { waitUntil: 'networkidle' })
const selectedProduct = await page.locator('select[name="product"]').inputValue()
if (selectedProduct !== 'optidist') failures.push('/lien-he: CTA chưa chọn sẵn đúng sản phẩm OptiDist 2')

await page.setViewportSize({ width: 375, height: 812 })
await page.goto(`${baseUrl}/san-pham/optidist`, { waitUntil: 'networkidle' })
await loadImages()
const mobileProductHeroHeight = await page.locator('.product-detail-hero').evaluate((element) =>
  Math.round(element.getBoundingClientRect().height),
)
const mobileCtaHeights = await page.locator('.product-consultation-actions .button').evaluateAll((elements) =>
  elements.map((element) => Math.round(element.getBoundingClientRect().height)),
)
const mobileGalleryRatio = await page.locator('.product-gallery-stage').evaluate((element) => {
  const rect = element.getBoundingClientRect()
  return rect.width / rect.height
})
const mobileGalleryImageInside = await page.locator('.product-gallery-stage img').evaluate((image) => {
  const imageRect = image.getBoundingClientRect()
  const frameRect = image.parentElement?.getBoundingClientRect()
  return Boolean(frameRect)
    && imageRect.left >= frameRect.left
    && imageRect.right <= frameRect.right
    && imageRect.top >= frameRect.top
    && imageRect.bottom <= frameRect.bottom
})
if (mobileCtaHeights.some((height) => height < 44)) failures.push('/san-pham/optidist mobile: CTA nhỏ hơn 44px')
if (mobileProductHeroHeight > 1250) failures.push(`/san-pham/optidist mobile: hero sản phẩm còn quá cao (${mobileProductHeroHeight}px)`)
if (mobileGalleryRatio < 1.32 || mobileGalleryRatio > 1.35) {
  failures.push(`/san-pham/optidist mobile: khung ảnh có tỷ lệ ${mobileGalleryRatio.toFixed(2)}, cần 4:3`)
}
if (!mobileGalleryImageInside) failures.push('/san-pham/optidist mobile: ảnh chi tiết bị cắt khỏi khung')
if (await hasHorizontalOverflow()) failures.push('/san-pham/optidist mobile: giao diện bị tràn ngang')

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase2-product-mobile.png'),
  fullPage: true,
})

await page.getByRole('button', { name: 'EN', exact: true }).click()
await page.getByRole('heading', { name: 'Need to confirm whether this product fits your application?' }).waitFor()
if (await hasHorizontalOverflow()) failures.push('/san-pham/optidist mobile EN: giao diện bị tràn ngang')

await browser.close()

for (const error of browserErrors) failures.push(`Browser console: ${error}`)

if (failures.length) {
  console.error('Kiểm tra Giai đoạn 2 không đạt:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Kiểm tra Giai đoạn 2 đạt: ảnh PAC/Baker Hughes không bị cắt, nền khung trong suốt, metadata, filter mobile, CTA và prefill liên hệ.')
