import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'
const outputDir = process.env.PHASE3_SCREENSHOT_DIR ?? os.tmpdir()
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

await page.goto(`${baseUrl}/gioi-thieu`, { waitUntil: 'networkidle' })
await loadImages()

const aboutHeroHeight = await page.locator('.page-intro').evaluate((element) =>
  Math.round(element.getBoundingClientRect().height),
)
const lifecycleSteps = await page.locator('.capability-lifecycle > li').count()
const caseFacts = await page.locator('.case-study-facts > div').count()
const directionPrinciples = await page.locator('.direction-principles > li').count()
const regionalPresenceItems = await page.locator('.regional-presence-list > li').count()
const officeDetailsLink = await page.locator('a[href="/lien-he#office-network"]').count()
const caseImageLoaded = await page.locator('.case-study-media img').evaluate((image) =>
  image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
)
if (lifecycleSteps !== 4) failures.push(`/gioi-thieu: lifecycle có ${lifecycleSteps} bước, cần 4`)
if (caseFacts !== 3) failures.push(`/gioi-thieu: case study có ${caseFacts} mục, cần 3`)
if (directionPrinciples !== 2) failures.push(`/gioi-thieu: định hướng có ${directionPrinciples} nguyên tắc, cần 2`)
if (regionalPresenceItems !== 3) failures.push(`/gioi-thieu: hiện diện khu vực có ${regionalPresenceItems} địa điểm, cần 3`)
if (officeDetailsLink !== 1) failures.push('/gioi-thieu: thiếu liên kết đến thông tin văn phòng đầy đủ')
if (await page.locator('.pre-footer-cta').count()) failures.push('/gioi-thieu: vẫn còn CTA kỹ thuật dùng chung')
if (!caseImageLoaded) failures.push('/gioi-thieu: ảnh thật của case study không tải được')
if (aboutHeroHeight > 420) failures.push(`/gioi-thieu desktop: hero còn quá cao (${aboutHeroHeight}px)`)
if (await hasHorizontalOverflow()) failures.push('/gioi-thieu desktop: giao diện bị tràn ngang')

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase3-about-desktop.png'),
  fullPage: true,
})

await page.goto(`${baseUrl}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
await loadImages()
const newsHeroHeight = await page.locator('.page-intro').evaluate((element) =>
  Math.round(element.getBoundingClientRect().height),
)
const featuredFieldStory = await page.locator('.news-hero-feature').count()
const initialNewsCards = await page.locator('.news-card').count()
if (featuredFieldStory !== 1) failures.push('/tin-tuc-su-kien: thiếu bài nổi bật trong hero')
if (initialNewsCards !== 2) failures.push(`/tin-tuc-su-kien: danh sách mặc định có ${initialNewsCards} bài, cần 2 ngoài bài nổi bật`)
await page.getByRole('button', { name: 'Dự án', exact: true }).click()
const projectCards = await page.locator('.news-card').count()
if (projectCards !== 2) failures.push(`/tin-tuc-su-kien: lọc dự án trả về ${projectCards} bài, cần 2`)
await page.getByRole('button', { name: 'Sự kiện', exact: true }).click()
const eventCards = await page.locator('.news-card').count()
if (eventCards !== 1) failures.push(`/tin-tuc-su-kien: lọc sự kiện trả về ${eventCards} bài, cần 1`)
if (newsHeroHeight > 480) failures.push(`/tin-tuc-su-kien desktop: hero còn quá cao (${newsHeroHeight}px)`)
if (await hasHorizontalOverflow()) failures.push('/tin-tuc-su-kien desktop: giao diện bị tràn ngang')
if (await page.locator('.pre-footer-cta').count()) failures.push('/tin-tuc-su-kien: vẫn còn CTA kỹ thuật dùng chung')
await page.getByRole('button', { name: 'Tất cả', exact: true }).click()

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase3-news-desktop.png'),
  fullPage: true,
})

for (const [route, actionLabel, selectedInterest] of [
  ['/pac', 'Nhờ tư vấn thiết bị phân tích', 'group-pac'],
  ['/baker-hughes', 'Nhờ tư vấn giải pháp van', 'group-baker-hughes'],
]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
  const catalogCta = page.locator('.pre-footer-cta')
  if (await catalogCta.count() !== 1) failures.push(`${route}: thiếu CTA tư vấn riêng của danh mục`)
  const action = catalogCta.getByRole('link', { name: actionLabel, exact: true })
  if (await action.count() !== 1) failures.push(`${route}: CTA không có nội dung đúng ngữ cảnh`)
  else {
    await action.click()
    await page.waitForURL(/\/lien-he\?nhom=/)
    const value = await page.locator('select[name="product"]').inputValue()
    if (value !== selectedInterest) failures.push(`${route}: nhóm giải pháp chưa được chọn sẵn trong form`)
  }
}

await page.goto(`${baseUrl}/tin-tuc/ban-giao-pac-optidist-2`, { waitUntil: 'networkidle' })
if (await page.locator('.pre-footer-cta').count()) failures.push('/tin-tuc/ban-giao-pac-optidist-2: vẫn còn CTA dùng chung')
if (await page.locator('.article-related').count() !== 1) failures.push('/tin-tuc/ban-giao-pac-optidist-2: thiếu sản phẩm liên quan')
if (await page.locator('.article-next-action').count()) failures.push('/tin-tuc/ban-giao-pac-optidist-2: xuất hiện thêm CTA không cần thiết')

await page.goto(`${baseUrl}/tin-tuc/hoi-thao-van-an-toan`, { waitUntil: 'networkidle' })
if (await page.locator('.pre-footer-cta').count()) failures.push('/tin-tuc/hoi-thao-van-an-toan: vẫn còn CTA dùng chung')
if (await page.getByRole('link', { name: 'Xem giải pháp van Baker Hughes', exact: true }).count() !== 1) {
  failures.push('/tin-tuc/hoi-thao-van-an-toan: thiếu hành động dẫn đến giải pháp van')
}

await page.goto(`${baseUrl}/tin-tuc/chuyen-giao-dfa-70xi`, { waitUntil: 'networkidle' })
await loadImages()
const phaseAction = page.getByRole('link', { name: 'Trao đổi về ứng dụng này', exact: true })
if (await page.locator('.pre-footer-cta').count()) failures.push('/tin-tuc/chuyen-giao-dfa-70xi: vẫn còn CTA dùng chung')
if (await phaseAction.count() !== 1) failures.push('/tin-tuc/chuyen-giao-dfa-70xi: thiếu CTA theo ứng dụng')
else {
  await page.screenshot({
    path: path.join(outputDir, 'ltvn-phase3-article-action-desktop.png'),
    fullPage: true,
  })
  await phaseAction.click()
  await page.waitForURL(/\/lien-he\?chu-de=phase-70xi/)
  const phaseInterest = await page.locator('select[name="product"]').inputValue()
  if (phaseInterest !== 'topic-phase-70xi') failures.push('/tin-tuc/chuyen-giao-dfa-70xi: chủ đề chưa được chọn sẵn trong form')
}

await page.goto(`${baseUrl}/duong-dan-khong-ton-tai`, { waitUntil: 'networkidle' })
if (await page.locator('.pre-footer-cta').count()) failures.push('/404: vẫn còn CTA kỹ thuật dùng chung')

await page.goto(`${baseUrl}/lien-he?san-pham=optidist`, { waitUntil: 'networkidle' })
const contactHeroHeight = await page.locator('.page-intro').evaluate((element) =>
  Math.round(element.getBoundingClientRect().height),
)
const formControls = await page.locator('.contact-form input, .contact-form select, .contact-form textarea').count()
const selectedProduct = await page.locator('select[name="product"]').inputValue()
const contactHeroActions = await page.locator('.page-intro-contact .page-intro-actions a').count()
const contactOffices = await page.locator('.office-list-item').count()
if (formControls !== 4) failures.push(`/lien-he: form có ${formControls} trường, cần 4`)
if (selectedProduct !== 'optidist') failures.push('/lien-he: sản phẩm từ CTA chưa được chọn sẵn')
if (contactHeroActions !== 2) failures.push(`/lien-he: hero có ${contactHeroActions} kênh trực tiếp, cần 2`)
if (contactOffices !== 3) failures.push(`/lien-he: danh sách văn phòng có ${contactOffices} mục, cần 3`)
if (await page.locator('.pre-footer-cta').count()) failures.push('/lien-he: xuất hiện CTA phụ bên ngoài form')
if (contactHeroHeight > 420) failures.push(`/lien-he desktop: hero còn quá cao (${contactHeroHeight}px)`)
if (await hasHorizontalOverflow()) failures.push('/lien-he desktop: giao diện bị tràn ngang')

await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase3-contact-desktop.png'),
  fullPage: true,
})

await page.locator('input[name="name"]').fill('Nguyen Van A')
await page.locator('input[name="contact"]').fill('contact@example.com')
await page.locator('textarea[name="message"]').fill('Yeu cau tu van thiet bi')
await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click()
if (!await page.locator('.form-status').isVisible()) failures.push('/lien-he: form không hiển thị trạng thái sau khi gửi')

await page.setViewportSize({ width: 375, height: 812 })
for (const [route, fileName] of [
  ['/gioi-thieu', 'about'],
  ['/tin-tuc-su-kien', 'news'],
  ['/lien-he', 'contact'],
]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
  await loadImages()
  if (await hasHorizontalOverflow()) failures.push(`${route} mobile: giao diện bị tràn ngang`)
  const actionHeights = await page.locator('.page-intro-actions .button').evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().height)),
  )
  const mobileHeroHeight = await page.locator('.page-intro').evaluate((element) =>
    Math.round(element.getBoundingClientRect().height),
  )
  if (actionHeights.some((height) => height < 44)) failures.push(`${route} mobile: CTA hero nhỏ hơn 44px`)
  if (mobileHeroHeight > 660) failures.push(`${route} mobile: hero còn quá cao (${mobileHeroHeight}px)`)
  await page.screenshot({
    path: path.join(outputDir, `ltvn-phase3-${fileName}-mobile.png`),
    fullPage: true,
  })
}

await page.goto(`${baseUrl}/gioi-thieu`, { waitUntil: 'networkidle' })
const mobileLifecycleColumns = await page.locator('.capability-lifecycle').evaluate((element) =>
  getComputedStyle(element).gridTemplateColumns.split(' ').length,
)
if (mobileLifecycleColumns !== 1) failures.push(`/gioi-thieu mobile: lifecycle có ${mobileLifecycleColumns} cột, cần 1`)

await page.goto(`${baseUrl}/tin-tuc/chuyen-giao-dfa-70xi`, { waitUntil: 'networkidle' })
await loadImages()
if (await hasHorizontalOverflow()) failures.push('/tin-tuc/chuyen-giao-dfa-70xi mobile: giao diện bị tràn ngang')
const phaseActionHeight = await page.getByRole('link', { name: 'Trao đổi về ứng dụng này', exact: true }).evaluate((element) =>
  Math.round(element.getBoundingClientRect().height),
)
if (phaseActionHeight < 44) failures.push(`/tin-tuc/chuyen-giao-dfa-70xi mobile: CTA chỉ cao ${phaseActionHeight}px`)
await page.screenshot({
  path: path.join(outputDir, 'ltvn-phase3-article-action-mobile.png'),
  fullPage: true,
})

await page.goto(`${baseUrl}/gioi-thieu`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'EN', exact: true }).click()
await page.getByRole('heading', { name: 'One partner across four coordinated stages' }).waitFor()
await page.goto(`${baseUrl}/tin-tuc-su-kien`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Projects, events and technical updates' }).waitFor()
await page.goto(`${baseUrl}/lien-he`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Send a short requirement brief' }).waitFor()
if (await hasHorizontalOverflow()) failures.push('/lien-he mobile EN: giao diện bị tràn ngang')

await browser.close()

for (const error of browserErrors) failures.push(`Browser console: ${error}`)

if (failures.length) {
  console.error('Kiểm tra Giai đoạn 3 không đạt:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('Kiểm tra Giai đoạn 3 đạt: nội dung, CTA theo ngữ cảnh, form và luồng chuyển trang VI/EN.')
