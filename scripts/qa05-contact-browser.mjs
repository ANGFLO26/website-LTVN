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

let mockBehavior = { mode: 'status', status: 201, body: { status: 'new' } }

await context.route('**/*', async route => {
  const req = route.request()
  const url = new URL(req.url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api')) return route.continue()
  if (url.pathname === '/api/contacts' && req.method() === 'POST') {
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
page.setDefaultTimeout(6000)

const form = page.locator('.contact-form')
const field = name => form.locator(`[name="${name}"]`)
const submit = () => form.locator('button[type="submit"]').click()
const pass = label => console.log(`PASS: ${label}`)

async function fillValid() {
  await field('fullName').fill('Nguyễn Văn An')
  await field('companyName').fill('Công ty Kiểm định Việt Nam')
  await field('email').fill('visitor+qa05@example.com')
  await field('phone').fill('+84 912 345 678')
  await field('requestType').selectOption('product_consultation')
  await field('message').fill('Yêu cầu tư vấn kỹ thuật máy PAC.')
}

try {
  // Scenario 1: HTTP 201 Created -> Success UI displayed, no error
  mockBehavior = { mode: 'status', status: 201, body: { status: 'new' } }
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  await fillValid()
  let response = page.waitForResponse(res => res.url() === `${origin}/api/contacts`)
  await submit()
  await response
  await form.getByRole('status').waitFor()
  assert.equal(await form.getByRole('status').count(), 1)
  assert.equal(await form.getByRole('alert').count(), 0)
  const successText = await form.getByRole('status').textContent()
  assert.ok(successText.includes('Yêu cầu tư vấn của bạn đã được gửi thành công'))
  pass('201 Created: displays success confirmation, no error message')

  // Scenario 2: HTTP 400 Bad Request -> No success, validation error displayed, form preserved, retry possible
  mockBehavior = { mode: 'status', status: 400, body: { statusCode: 400, message: ['email must be an email'] } }
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  await fillValid()
  response = page.waitForResponse(res => res.url() === `${origin}/api/contacts`)
  await submit()
  await response
  await form.getByRole('alert').waitFor()
  assert.equal(await form.getByRole('status').count(), 0)
  assert.equal(await form.getByRole('alert').count(), 1)
  const valErrorText = await form.getByRole('alert').textContent()
  assert.ok(valErrorText.includes('Thông tin gửi chưa hợp lệ'))
  assert.equal(await field('fullName').inputValue(), 'Nguyễn Văn An')
  assert.equal(await field('companyName').inputValue(), 'Công ty Kiểm định Việt Nam')
  assert.equal(await field('message').inputValue(), 'Yêu cầu tư vấn kỹ thuật máy PAC.')
  pass('400 Bad Request: displays validation error, no false success, form data preserved')

  // Scenario 3: HTTP 422 Unprocessable Entity -> No success, server error displayed, form preserved
  mockBehavior = { mode: 'status', status: 422, body: { statusCode: 422, message: 'Unprocessable' } }
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  await fillValid()
  response = page.waitForResponse(res => res.url() === `${origin}/api/contacts`)
  await submit()
  await response
  await form.getByRole('alert').waitFor()
  assert.equal(await form.getByRole('status').count(), 0)
  assert.equal(await form.getByRole('alert').count(), 1)
  const err422Text = await form.getByRole('alert').textContent()
  assert.ok(err422Text.includes('Hệ thống đang gặp sự cố'))
  assert.equal(await field('fullName').inputValue(), 'Nguyễn Văn An')
  pass('422 Unprocessable: displays server error, no false success, form data preserved')

  // Scenario 4: HTTP 500 Internal Server Error -> No success, server error displayed, form preserved, retry possible
  mockBehavior = { mode: 'status', status: 500, body: { statusCode: 500, message: 'Internal server error' } }
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  await fillValid()
  response = page.waitForResponse(res => res.url() === `${origin}/api/contacts`)
  await submit()
  await response
  await form.getByRole('alert').waitFor()
  assert.equal(await form.getByRole('status').count(), 0)
  assert.equal(await form.getByRole('alert').count(), 1)
  const err500Text = await form.getByRole('alert').textContent()
  assert.ok(err500Text.includes('Hệ thống đang gặp sự cố'))
  assert.equal(await field('fullName').inputValue(), 'Nguyễn Văn An')
  // Verify retry works by switching to 201
  mockBehavior = { mode: 'status', status: 201, body: { status: 'new' } }
  response = page.waitForResponse(res => res.url() === `${origin}/api/contacts`)
  await submit()
  await response
  await form.getByRole('status').waitFor()
  assert.equal(await form.getByRole('status').count(), 1)
  assert.equal(await form.getByRole('alert').count(), 0)
  pass('500 Server Error: displays server error, no false success, retry successful')

  // Scenario 5: Network Reject / Connection Abort -> No success, network error displayed, form preserved
  mockBehavior = { mode: 'abort' }
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  await fillValid()
  await submit()
  await form.getByRole('alert').waitFor()
  assert.equal(await form.getByRole('status').count(), 0)
  assert.equal(await form.getByRole('alert').count(), 1)
  const netErrorText = await form.getByRole('alert').textContent()
  assert.ok(netErrorText.includes('Không thể kết nối đến máy chủ'))
  assert.equal(await field('fullName').inputValue(), 'Nguyễn Văn An')
  assert.equal(await field('message').inputValue(), 'Yêu cầu tư vấn kỹ thuật máy PAC.')
  pass('Network Reject: displays network connection error, no false success, form preserved')

  console.log('\n=== ALL QA-05 CONTACT BROWSER TESTS PASSED ===')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
