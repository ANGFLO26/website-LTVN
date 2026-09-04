import process from 'node:process'
import { chromium } from 'playwright'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const failures = []
const browserErrors = []

page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text())
})
page.on('pageerror', (error) => browserErrors.push(error.message))

async function checkRoute(path, expectedHeading) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' })
  if (!response?.ok()) failures.push(`${path}: HTTP ${response?.status() ?? 'unknown'}`)

  const language = await page.locator('html').getAttribute('lang')
  if (language !== 'en') failures.push(`${path}: html lang là ${language}, cần là en`)

  const heading = (await page.locator('h1').first().textContent())?.trim()
  if (heading !== expectedHeading) {
    failures.push(`${path}: h1 là "${heading}", cần là "${expectedHeading}"`)
  }
}

await page.goto(baseUrl, { waitUntil: 'networkidle' })
const initialLanguage = await page.locator('html').getAttribute('lang')
const initialHeading = (await page.locator('h1').first().textContent())?.trim()
if (initialLanguage !== 'vi') failures.push(`Ngôn ngữ mặc định là ${initialLanguage}, cần là vi`)
if (initialHeading !== 'Giải pháp thiết bị cho phòng thí nghiệm và nhà máy.') {
  failures.push(`H1 tiếng Việt mặc định không đúng: "${initialHeading}"`)
}
await page.getByRole('button', { name: 'EN', exact: true }).click()
await page.reload({ waitUntil: 'networkidle' })

const metaDescription = await page.locator('meta[name="description"]').getAttribute('content')
if (!metaDescription?.startsWith('LT Vietnam supplies')) {
  failures.push('Meta description chưa chuyển sang tiếng Anh.')
}

const homeProcessTabCount = await page.locator('.home-process-tab').count()
if (homeProcessTabCount !== 3) {
  failures.push(`/: quy trình hỗ trợ có ${homeProcessTabCount} bước được định dạng, cần 3`)
}
const homeProcessDisplay = await page.locator('.home-process-layout').evaluate((element) =>
  getComputedStyle(element).display,
)
if (homeProcessDisplay !== 'grid') {
  failures.push(`/: bố cục quy trình hỗ trợ là ${homeProcessDisplay}, cần grid`)
}
await page.locator('.home-process-tab').nth(1).click()
const selectedProcessTab = await page.locator('.home-process-tab[aria-selected="true"]').textContent()
if (!selectedProcessTab?.includes('Select and implement')) {
  failures.push('/: chuyển bước quy trình hỗ trợ không hoạt động')
}

const routes = [
  ['/', 'Equipment solutions for laboratories and plants.'],
  ['/gioi-thieu', 'Technical capability for industry and laboratories'],
  ['/pac', 'Fuel and laboratory analysis instruments'],
  ['/baker-hughes', 'Control valve and safety valve solutions'],
  ['/san-pham/optidist', 'OptiDist 2'],
  ['/tin-tuc-su-kien', 'News and Events'],
  [
    '/tin-tuc/ban-giao-pac-optidist-2',
    'LT Vietnam completes the installation and handover of PAC OptiDist 2 at Quatest 2',
  ],
  ['/lien-he', 'Contact LT Vietnam'],
  ['/duong-dan-khong-ton-tai', 'Page not found'],
]

for (const [path, heading] of routes) await checkRoute(path, heading)

await page.goto(`${baseUrl}/gioi-thieu`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Selected customers' }).waitFor()
const customerLogoCount = await page.locator('.customer-logo-item').count()
if (customerLogoCount !== 18) failures.push(`/gioi-thieu: có ${customerLogoCount} logo khách hàng, cần 18`)
await page.locator('.customer-logo').evaluateAll(async (images) => {
  images.forEach((image) => {
    image.loading = 'eager'
  })
  await Promise.all(images.map((image) => image.decode()))
})
const unloadedCustomerLogos = await page.locator('.customer-logo').evaluateAll((images) =>
  images.filter((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0).length,
)
if (unloadedCustomerLogos > 0) {
  failures.push(`/gioi-thieu: có ${unloadedCustomerLogos} tệp logo khách hàng không tải được`)
}

await page.goto(`${baseUrl}/pac`, { waitUntil: 'networkidle' })
await page.getByPlaceholder('Search by product, model or standard').fill('vapor pressure')
const resultCount = await page.locator('.product-card').count()
if (resultCount !== 1) failures.push(`/pac: tìm "vapor pressure" trả về ${resultCount} sản phẩm, cần 1`)

await page.setViewportSize({ width: 375, height: 812 })
for (const [path] of routes) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' })
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  if (overflows) failures.push(`${path}: giao diện EN bị tràn ngang ở viewport 375px`)
}

await page.goto(`${baseUrl}/gioi-thieu`, { waitUntil: 'networkidle' })
const mobileCustomerColumns = await page.locator('.customer-logo-grid').evaluate((element) =>
  getComputedStyle(element).gridTemplateColumns.split(' ').length,
)
if (mobileCustomerColumns !== 2) failures.push(`/gioi-thieu: lưới mobile có ${mobileCustomerColumns} cột, cần 2`)

await page.setViewportSize({ width: 844, height: 390 })
await page.goto(`${baseUrl}/gioi-thieu`, { waitUntil: 'networkidle' })
const landscapeOverflows = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
)
if (landscapeOverflows) failures.push('/gioi-thieu: giao diện landscape bị tràn ngang ở viewport 844x390')

await browser.close()

if (browserErrors.length) {
  for (const error of browserErrors) failures.push(`Browser console: ${error}`)
}

if (failures.length) {
  console.error('Smoke test không đạt:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Smoke test đạt: ${routes.length} route desktop/mobile, VI mặc định, lưu EN, metadata và tìm kiếm song ngữ.`)
