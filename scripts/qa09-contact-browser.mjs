import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

// Serve the public build and intercept all API calls. Never contact a real API/database.
const dist = path.resolve('dist')
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
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

let mockBehavior = { delayMs: 0, status: 201, body: { status: 'new' }, mode: 'status' }
const postRequests = []

await context.route('**/*', async route => {
  const req = route.request()
  const url = new URL(req.url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api')) return route.continue()
  if (url.pathname === '/api/contacts' && req.method() === 'POST') {
    postRequests.push({ body: req.postDataJSON(), time: Date.now() })
    if (mockBehavior.delayMs > 0) {
      await new Promise(r => setTimeout(r, mockBehavior.delayMs))
    }
    if (mockBehavior.mode === 'abort') {
      return route.abort('failed')
    }
    return route.fulfill({
      status: mockBehavior.status,
      contentType: 'application/json',
      body: JSON.stringify(mockBehavior.body),
    })
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
})

const page = await context.newPage()
page.setDefaultTimeout(8000)

const form = page.locator('.contact-form')
const field = name => form.locator(`[name="${name}"]`)
const submitBtn = form.locator('button[type="submit"]')
const pass = label => console.log(`PASS: ${label}`)

async function fillValid() {
  await field('fullName').fill('Nguyễn Văn An')
  await field('companyName').fill('Công ty Kiểm định Việt Nam')
  await field('email').fill('visitor+qa09@example.com')
  await field('phone').fill('+84 912 345 678')
  await field('requestType').selectOption('product_consultation')
  await field('message').fill('Yêu cầu báo giá PAC OptiDist.')
}

try {
  // Scenario 1: Rapid double-click while pending -> exactly 1 POST, button disabled, no second request
  postRequests.length = 0
  mockBehavior = { delayMs: 400, status: 201, body: { status: 'new' }, mode: 'status' }
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  await fillValid()

  // Click 1 initiates request
  await submitBtn.click({ noWaitAfter: true })
  // Verify button is disabled and aria-busy is true during in-flight request
  assert.equal(await submitBtn.isDisabled(), true)
  assert.equal(await submitBtn.getAttribute('aria-busy'), 'true')

  // Attempt second click while in-flight (both via dispatchEvent and evaluate)
  await submitBtn.dispatchEvent('click').catch(() => {})
  await page.evaluate(() => {
    const btn = document.querySelector('.contact-form button[type="submit"]')
    if (btn) btn.click()
  }).catch(() => {})

  // Wait for request to complete
  await form.getByRole('status').waitFor()
  assert.equal(postRequests.length, 1)
  pass('Scenario 1: Rapid double-click generates only 1 POST, button is disabled during in-flight request')

  // Scenario 2: Success lifecycle -> pending false, button usable again, success message shown
  assert.equal(await submitBtn.isDisabled(), false)
  assert.equal(await submitBtn.getAttribute('aria-busy'), 'false')
  assert.equal(await form.getByRole('status').count(), 1)
  assert.equal(await form.getByRole('alert').count(), 0)
  pass('Scenario 2: On success, button lock is released, button usable again, success message shown')

  // Scenario 3: Server 500 -> 1 POST, error shown, button usable again, form data preserved, retry works
  postRequests.length = 0
  mockBehavior = { delayMs: 100, status: 500, body: { statusCode: 500, message: 'Server error' }, mode: 'status' }
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  await fillValid()

  await submitBtn.click({ noWaitAfter: true })
  assert.equal(await submitBtn.isDisabled(), true)

  await form.getByRole('alert').waitFor()
  assert.equal(postRequests.length, 1)
  assert.equal(await form.getByRole('status').count(), 0)
  assert.equal(await form.getByRole('alert').count(), 1)
  assert.equal(await field('fullName').inputValue(), 'Nguyễn Văn An')
  // Lock must be released
  assert.equal(await submitBtn.isDisabled(), false)

  // Verify retry works
  mockBehavior = { delayMs: 0, status: 201, body: { status: 'new' }, mode: 'status' }
  await submitBtn.click()
  await form.getByRole('status').waitFor()
  assert.equal(postRequests.length, 2)
  assert.equal(await form.getByRole('status').count(), 1)
  assert.equal(await submitBtn.isDisabled(), false)
  pass('Scenario 3: Server 500 releases button lock, preserves input, and allows retry')

  // Scenario 4: Network failure -> lock released, form data preserved, button usable again, retry works
  postRequests.length = 0
  mockBehavior = { delayMs: 50, mode: 'abort' }
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  await fillValid()

  await submitBtn.click({ noWaitAfter: true })
  assert.equal(await submitBtn.isDisabled(), true)

  await form.getByRole('alert').waitFor()
  assert.equal(await form.getByRole('status').count(), 0)
  assert.equal(await form.getByRole('alert').count(), 1)
  assert.equal(await field('fullName').inputValue(), 'Nguyễn Văn An')
  assert.equal(await submitBtn.isDisabled(), false)

  // Verify retry after network error
  mockBehavior = { delayMs: 0, status: 201, body: { status: 'new' }, mode: 'status' }
  await submitBtn.click()
  await form.getByRole('status').waitFor()
  assert.equal(await form.getByRole('status').count(), 1)
  assert.equal(await submitBtn.isDisabled(), false)
  pass('Scenario 4: Network failure releases button lock, preserves input, and allows retry')

  // Scenario 5: Invalid frontend input -> 0 POST, not stuck in disabled/pending state
  postRequests.length = 0
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  // Leave required fields blank and click submit
  await submitBtn.click()
  await page.waitForTimeout(200)
  assert.equal(postRequests.length, 0)
  assert.equal(await submitBtn.isDisabled(), false)
  assert.equal(await submitBtn.getAttribute('aria-busy'), 'false')
  pass('Scenario 5: Invalid frontend input aborts before fetch, 0 POST, not stuck in disabled state')

  console.log('\n=== ALL QA-09 CONTACT BROWSER TESTS PASSED ===')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
