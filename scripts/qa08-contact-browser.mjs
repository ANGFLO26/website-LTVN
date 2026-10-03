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
const submissions = []
const errors = []
let replyStatus = 201

await context.route('**/*', async route => {
  const req = route.request()
  const url = new URL(req.url())
  if (url.origin !== origin) return route.abort()
  if (!url.pathname.startsWith('/api')) return route.continue()
  if (url.pathname === '/api/contacts' && req.method() === 'POST') {
    submissions.push({ body: req.postDataJSON(), authorization: req.headers().authorization })
    return route.fulfill({ status: replyStatus, contentType: 'application/json', body: JSON.stringify(
      replyStatus === 400 ? { statusCode: 400, message: ['email must be an email'] } : { status: 'new' },
    ) })
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
})

const page = await context.newPage()
page.setDefaultTimeout(6000)
page.on('pageerror', error => errors.push(error.message))
const form = page.locator('.contact-form')
const field = name => form.locator(`[name="${name}"]`)
const submit = () => form.locator('button[type="submit"]').click()
const pass = label => console.log(`PASS: ${label}`)
async function fillValid(requestType = 'product_consultation') {
  await field('fullName').fill('  Nguyễn Văn An  ')
  await field('companyName').fill('  Công ty Kiểm định Việt Nam  ')
  await field('email').fill('  visitor+qa@example.com  ')
  await field('phone').fill('  +84 (0) 912 345 678  ')
  await field('requestType').selectOption(requestType)
  await field('message').fill('  Tư vấn máy PAC.  ')
}

try {
  await page.goto(`${origin}/lien-he?nhom=pac`, { waitUntil: 'networkidle' })
  await form.waitFor()
  assert.equal(await field('email').getAttribute('type'), 'email')
  assert.equal(await field('email').getAttribute('required'), '')
  const requiredFields = ['fullName', 'companyName', 'phone', 'email', 'requestType', 'message']
  assert.equal(await form.locator('[name]').count(), 6)
  for (const name of requiredFields) assert.equal(await field(name).getAttribute('required'), '')
  assert.equal(await field('requestType').inputValue(), '')
  assert.deepEqual(await field('requestType').locator('option:not([value=""])').allTextContents(), [
    'Yêu cầu báo giá', 'Tư vấn lựa chọn sản phẩm', 'Hỗ trợ kỹ thuật',
    'Bảo trì hoặc sửa chữa', 'Hợp tác', 'Liên hệ khác',
  ])
  assert.equal(await field('contact').count(), 0)
  await fillValid()
  await field('email').fill('')
  await submit()
  assert.equal(submissions.length, 0)
  assert.equal(await field('email').evaluate(input => input.validity.valueMissing), true)
  pass('Exactly six required v1 fields and six controlled request types; missing email cannot submit')

  for (const name of ['companyName', 'phone', 'requestType']) {
    await fillValid()
    if (name === 'requestType') {
      await field(name).evaluate(select => {
        select.value = ''
        select.dispatchEvent(new Event('input', { bubbles: true }))
      })
    } else {
      await field(name).fill('')
    }
    await submit()
    assert.equal(submissions.length, 0)
    assert.equal(await field(name).evaluate(input => input.validity.valueMissing), true)
  }
  pass('Missing company, phone or request type is blocked before fetch')

  await fillValid()
  await field('fullName').fill('   ')
  await submit()
  assert.equal(submissions.length, 0)
  assert.equal(await field('fullName').evaluate(input => input.validity.customError), true)
  await field('fullName').fill('Nguyễn Văn An')
  await field('companyName').fill('   ')
  await submit()
  assert.equal(submissions.length, 0)
  assert.equal(await field('companyName').evaluate(input => input.validity.customError), true)
  await field('companyName').fill('Công ty Kiểm định Việt Nam')
  await field('message').fill('   ')
  await submit()
  assert.equal(submissions.length, 0)
  assert.equal(await field('message').evaluate(input => input.validity.customError), true)
  pass('Whitespace-only name/company/message is rejected before fetch and can be corrected')

  await fillValid()
  await field('email').fill('bad-email')
  await submit()
  assert.equal(submissions.length, 0)
  assert.equal(await field('email').evaluate(input => input.validity.typeMismatch), true)
  await field('email').fill('visitor+qa@example.com')
  await field('phone').fill('abc')
  await submit()
  assert.equal(submissions.length, 0)
  assert.equal(await field('phone').evaluate(input => input.validity.customError), true)
  pass('Invalid email/phone is rejected by basic client validation')

  await fillValid()
  let response = page.waitForResponse(res => res.url() === `${origin}/api/contacts`)
  await submit()
  await response
  assert.deepEqual(submissions[0], {
    body: {
      fullName: 'Nguyễn Văn An', companyName: 'Công ty Kiểm định Việt Nam',
      email: 'visitor+qa@example.com', phone: '+84 (0) 912 345 678',
      requestType: 'product_consultation', message: 'Tư vấn máy PAC.',
    },
    authorization: undefined,
  })
  assert.equal(JSON.stringify(submissions).includes('info@customer.vn'), false)
  pass('Valid six-field payload is trimmed, has no public subject or fake data, and sends no Bearer token')

  replyStatus = 400
  response = page.waitForResponse(res => res.url() === `${origin}/api/contacts` && res.status() === 400)
  await submit()
  await response
  await form.getByRole('alert').waitFor()
  assert.equal(await form.getByRole('status').count(), 0)
  pass('HTTP 400 displays a validation message without a success confirmation')

  replyStatus = 201
  await page.goto(`${origin}/lien-he`, { waitUntil: 'networkidle' })
  for (const requestType of ['quotation', 'product_consultation', 'technical_support', 'maintenance_repair', 'partnership', 'other']) {
    await fillValid(requestType)
    response = page.waitForResponse(res => res.url() === `${origin}/api/contacts`)
    await submit()
    await response
    assert.equal(submissions.at(-1).body.requestType, requestType)
    assert.deepEqual(Object.keys(submissions.at(-1).body).sort(), requiredFields.toSorted())
  }
  pass('All six request types submit their stable API code with exactly six visitor fields')
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
