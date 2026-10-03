import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { build, createServer as createViteServer } from '../admin/node_modules/vite/dist/node/index.js'

// Real production bundles with isolated build-time env fixtures. All API and external
// destinations are intercepted by Playwright; never use the Internet or a database.
const output = path.resolve(process.env.QA15_OUTPUT_DIR || 'artifacts/qa-2026-10-03/qa15')
const adminRoot = path.resolve('admin')
await mkdir(output, { recursive: true })
const results = []
const proof = { destinations: [], mutations: [], externalNetwork: 'blocked or mocked', migration: 'NOT EXECUTED' }
const pageErrors = []
const unexpectedRequests = []
const routesSource = await readFile('src/App.tsx', 'utf8')
assert.ok(routesSource.includes('path="san-pham/:slug"'))
assert.ok(routesSource.includes('path="tin-tuc/:slug"'))
for (const file of ['components/Header.tsx', 'pages/MachinesPage.tsx', 'pages/NewsEventsPage.tsx', 'pages/SettingsPage.tsx']) {
  const source = await readFile(path.join(adminRoot, 'src', file), 'utf8')
  assert.ok(!/(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(source), `${file} has no component loopback literal`)
  assert.ok(!source.includes('window.open'), `${file} has no untracked window.open destination`)
}
assert.ok((await readFile('api/src/main.ts', 'utf8')).includes("SwaggerModule.setup('api/docs'"))
proof.staticSource = 'PASS: public routes, real Swagger mount, no component loopback literals/window.open'

const cases = {
  configured: { publicSite: 'https://public.qa.example', api: 'https://api.qa.example' },
  slash: { publicSite: 'https://public.qa.example/', api: 'https://api.qa.example/api/' },
  missing: { publicSite: '', api: '' },
  invalid: { publicSite: 'javascript:alert(1)', api: '' },
}
const savedEnv = new Map(['VITE_PUBLIC_SITE_URL', 'VITE_API_BASE_URL', 'NODE_ENV'].map(key => [key, process.env[key]]))
for (const key of ['VITE_PUBLIC_SITE_URL', 'VITE_API_BASE_URL']) delete process.env[key]
const envDirs = {}
const buildDirs = {}
for (const [name, config] of Object.entries(cases)) {
  envDirs[name] = path.join(output, 'env', name)
  buildDirs[name] = path.join(output, 'builds', name)
  await mkdir(envDirs[name], { recursive: true })
  await writeFile(path.join(envDirs[name], '.env.production'), `VITE_PUBLIC_SITE_URL=${config.publicSite}\nVITE_API_BASE_URL=${config.api}\n`)
  await build({ root: adminRoot, envDir: envDirs[name], mode: 'production', base: `/${name}/`, logLevel: 'silent',
    build: { outDir: buildDirs[name], emptyOutDir: false } })
  console.log(`Built production Admin fixture: ${name}`)
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  const name = pathname.split('/')[1]
  const dist = buildDirs[name]
  if (!dist) { res.writeHead(404); res.end(); return }
  let file = path.resolve(dist, '.' + pathname.slice(name.length + 1))
  if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403); res.end(); return }
  try { if (!(await stat(file)).isFile()) file = path.join(dist, 'index.html') }
  catch { file = path.join(dist, 'index.html') }
  try {
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
    res.end(await readFile(file))
  } catch { res.writeHead(404); res.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const user = { id: randomUUID(), email: 'qa15@example.com', fullName: 'QA-15 Admin', role: 'admin' }
const password = randomBytes(16).toString('base64url')
const token = randomBytes(32).toString('base64url')
const machine = { id: randomUUID(), name: 'QA Machine', slug: 'qa-machine', model: 'QA', status: 'published', sortOrder: 1,
  applications: [], highlights: [], specs: [], standards: [], createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z' }
const article = { id: randomUUID(), title: 'Tin QA-15 VI', slug: 'tin-qa15-vi', type: 'news', status: 'published',
  createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-03T00:00:00Z',
  translations: { vi: { title: 'Tin QA-15 VI', slug: 'tin-qa15-vi' }, en: { title: 'QA-15 English news', slug: 'qa15-english-news' } } }
const contact = { id: randomUUID(), fullName: 'QA Contact', email: 'qa-contact@example.com', phone: '0901234567', companyName: 'QA', requestType: 'product_consultation', subject: 'QA request', message: 'QA message', status: 'new', createdAt: '2026-10-03T00:00:00Z' }

async function session(name, entry = `${origin}/${name}/`, config = cases[name]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const entryOrigin = new URL(entry).origin
  const apiBase = config.api ? new URL(config.api) : new URL('/api', entryOrigin)
  if (apiBase.pathname === '/') apiBase.pathname = '/api'
  const apiRoot = apiBase.pathname.replace(/\/+$/, '')
  const publicOrigin = config.publicSite && /^https?:/.test(config.publicSite) ? new URL(config.publicSite).origin : undefined
  const requests = []
  let machines = [structuredClone(machine)]
  await context.addInitScript(() => {
    window.__qa15WindowOpens = []
    const open = window.open
    window.open = function (...args) {
      window.__qa15WindowOpens.push(String(args[0] ?? ''))
      return open.apply(this, args)
    }
  })
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === apiBase.origin && (url.pathname === apiRoot || url.pathname.startsWith(apiRoot + '/'))) {
      const endpoint = '/api' + url.pathname.slice(apiRoot.length)
      if (endpoint === '/api/docs') return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Mock Swagger destination</h1>' })
      requests.push({ origin: url.origin, path: url.pathname, method: request.method(), bearer: request.headers().authorization === `Bearer ${token}` })
      if (endpoint === '/api/auth/login') {
        assert.deepEqual(request.postDataJSON(), { email: user.email, password })
        return route.fulfill({ json: { user, accessToken: token, expiresAt: Date.now() + 3600000 } })
      }
      assert.equal(request.headers().authorization, `Bearer ${token}`, 'Session bearer preserved for every Admin API call')
      if (endpoint === '/api/auth/me') return route.fulfill({ json: user })
      if (endpoint === '/api') return route.fulfill({ json: { status: 'ok' } })
      if (endpoint === '/api/admin/machines') return route.fulfill({ json: machines })
      if (endpoint === '/api/admin/news-events') return route.fulfill({ json: [article] })
      if (endpoint === '/api/contacts') return route.fulfill({ json: [contact] })
      if (endpoint === `/api/machines/${machine.id}` && request.method() === 'PUT') {
        machines[0] = { ...machines[0], ...request.postDataJSON() }
        return route.fulfill({ json: machines[0] })
      }
      if (endpoint === `/api/machines/${machine.id}` && request.method() === 'DELETE') {
        machines = []
        return route.fulfill({ status: 204 })
      }
      if (['/api/standards', '/api/media', '/api/users'].includes(endpoint)) return route.fulfill({ json: [] })
      unexpectedRequests.push(request.url())
      return route.abort()
    }
    if (url.origin === publicOrigin || (name === 'dev-fallback' && url.origin === 'http://localhost:5173')) {
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Mock public website destination</h1>' })
    }
    if (url.origin === entryOrigin && url.pathname.startsWith('/images/')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" />' })
    if (url.origin === entryOrigin && !url.pathname.startsWith('/api')) return route.continue()
    // Includes fonts/CDNs and any unexpected origin. No external traffic is allowed.
    return route.abort()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(7000)
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(entry, { waitUntil: 'networkidle' })
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.getByRole('heading', { name: 'Tổng Quan Hệ Thống', exact: true }).waitFor()
  return { context, page, requests }
}

async function clickDestination(page, link, expected) {
  assert.equal(await link.getAttribute('href'), expected)
  assert.equal(await link.getAttribute('target'), '_blank')
  const rel = (await link.getAttribute('rel')).split(/\s+/)
  assert.ok(rel.includes('noopener') && rel.includes('noreferrer'))
  const [popup] = await Promise.all([page.context().waitForEvent('page'), link.click()])
  await popup.waitForLoadState('domcontentloaded')
  assert.equal(popup.url(), expected)
  assert.equal(await popup.evaluate(() => window.opener === null), true)
  proof.destinations.push(expected)
  await popup.close()
}

async function test(id, name, run) {
  try {
    await run()
    results.push({ id, name, result: 'PASS' })
    console.log(`PASS ${id}: ${name}`)
  } catch (error) {
    results.push({ id, name, result: 'FAIL', error: error.message })
    throw error
  }
}

try {
  await test('T1', 'Header website uses configured public origin', async () => {
    const { context, page } = await session('configured')
    try {
      await clickDestination(page, page.getByRole('link', { name: 'Xem website', exact: true }), 'https://public.qa.example/')
      await page.screenshot({ path: path.join(output, 'configured-header.png') })
    } finally { await context.close() }
  })
  await test('T2', 'Machine preview uses actual public product route', async () => {
    const { context, page } = await session('configured')
    try {
      await page.getByRole('button', { name: 'Máy Phân Tích PAC', exact: true }).click()
      await clickDestination(page, page.getByRole('link', { name: 'Xem trang sản phẩm trên website' }), 'https://public.qa.example/san-pham/qa-machine')
    } finally { await context.close() }
  })
  await test('T3', 'News preview preserves existing VI slug semantics', async () => {
    const { context, page } = await session('configured')
    try {
      await page.getByRole('button', { name: 'Tin Tức & Sự Kiện', exact: true }).click()
      const preview = page.getByRole('link', { name: 'Xem bài viết trên website' })
      await clickDestination(page, preview, 'https://public.qa.example/tin-tuc/tin-qa15-vi')
      await page.locator('button[title="Sửa bài"]').click()
      await page.locator('.modal-dialog button.tab-pill').filter({ hasText: 'English' }).click()
      assert.equal(await page.locator('input[placeholder*="Technical Seminar"]').inputValue(), article.translations.en.title)
      assert.equal(await preview.getAttribute('href'), 'https://public.qa.example/tin-tuc/tin-qa15-vi')
    } finally { await context.close() }
  })
  await test('T4', 'Both Swagger links share the configured API request base', async () => {
    const { context, page, requests } = await session('configured')
    try {
      await clickDestination(page, page.getByRole('link', { name: 'Mở tài liệu Swagger OpenAPI' }), 'https://api.qa.example/api/docs')
      await page.getByRole('button', { name: 'Cấu Hình API', exact: true }).click()
      await clickDestination(page, page.getByRole('link', { name: 'Mở Swagger OpenAPI UI', exact: true }), 'https://api.qa.example/api/docs')
      assert.ok(requests.some(r => r.path === '/api/auth/login'))
      assert.ok(requests.some(r => r.path === '/api/admin/machines'))
      assert.ok(requests.every(r => r.origin === 'https://api.qa.example'))
      proof.apiOrigin = 'https://api.qa.example'
    } finally { await context.close() }
  })
  await test('T5', 'Trailing slash and /api suffix normalize without duplication', async () => {
    const { context, page } = await session('slash')
    try {
      await clickDestination(page, page.getByRole('link', { name: 'Xem website', exact: true }), 'https://public.qa.example/')
      await page.getByRole('button', { name: 'Máy Phân Tích PAC', exact: true }).click()
      await clickDestination(page, page.getByRole('link', { name: 'Xem trang sản phẩm trên website' }), 'https://public.qa.example/san-pham/qa-machine')
      await page.getByRole('button', { name: 'Tin Tức & Sự Kiện', exact: true }).click()
      await clickDestination(page, page.getByRole('link', { name: 'Xem bài viết trên website' }), 'https://public.qa.example/tin-tuc/tin-qa15-vi')
      assert.equal(await page.getByRole('link', { name: 'Mở tài liệu Swagger OpenAPI' }).getAttribute('href'), 'https://api.qa.example/api/docs')
    } finally { await context.close() }
  })
  await test('T6', 'All Admin views have zero clickable loopback destinations', async () => {
    const { context, page } = await session('configured')
    try {
      const hrefs = []
      for (const view of ['Dashboard', 'Máy Phân Tích PAC', 'Tiêu Chuẩn Quốc Tế', 'Thư Viện Media', 'Tin Tức & Sự Kiện', 'Yêu Cầu Liên Hệ', 'Tài Khoản Quản Trị', 'Cấu Hình API']) {
        await page.getByRole('button', { name: new RegExp('^' + view) }).click()
        const visible = page.locator('a[href]:visible')
        for (const link of await visible.all()) {
          const href = await link.getAttribute('href')
          assert.ok(!/localhost|127\.0\.0\.1/i.test(href), `${view}: no loopback link`)
          hrefs.push({ view, href })
          if (await link.getAttribute('target') === '_blank') assert.equal(await link.getAttribute('rel'), 'noopener noreferrer')
        }
        const opens = await page.evaluate(() => window.__qa15WindowOpens)
        assert.ok(opens.every(url => !/localhost|127\.0\.0\.1/i.test(url)))
      }
      // Contact links are inside the detail modal; the menu name also has a count badge.
      await page.getByRole('button', { name: /^Yêu Cầu Liên Hệ/ }).click()
      await page.locator('button:has-text("Xem & Xử lý")').click()
      assert.equal(await page.locator('a[href^="mailto:"]').getAttribute('href'), 'mailto:' + contact.email)
      assert.equal(await page.locator('a[href^="tel:"]').getAttribute('href'), 'tel:' + contact.phone)
      proof.visibleHrefInventory = hrefs
      proof.productionClickableLoopbackCount = 0
    } finally { await context.close() }
  })
  await test('T7', 'Real development server supports explicit local URLs and dev fallback', async () => {
    for (const configured of [true, false]) {
      const name = configured ? 'dev-explicit' : 'dev-fallback'
      const envDir = path.join(output, 'env', name)
      await mkdir(envDir, { recursive: true })
      const config = { publicSite: configured ? 'http://127.0.0.1:5173/' : '', api: 'http://localhost:3000' }
      await writeFile(path.join(envDir, '.env.development'), `VITE_PUBLIC_SITE_URL=${config.publicSite}\nVITE_API_BASE_URL=${config.api}\n`)
      process.env.NODE_ENV = 'development'
      const vite = await createViteServer({ root: adminRoot, envDir, mode: 'development', server: { host: '127.0.0.1', port: 0 } })
      await vite.listen()
      const entry = `http://127.0.0.1:${vite.httpServer.address().port}/`
      let context
      try {
        const current = await session(name, entry, config)
        context = current.context
        const page = current.page
        await clickDestination(page, page.getByRole('link', { name: 'Xem website', exact: true }), configured ? 'http://127.0.0.1:5173/' : 'http://localhost:5173/')
        assert.equal(await page.getByRole('link', { name: 'Mở tài liệu Swagger OpenAPI' }).getAttribute('href'), 'http://localhost:3000/api/docs')
      } finally { await context?.close(); await vite.close() }
    }
  })
  await test('T8', 'Missing/invalid production public config disables all public links', async () => {
    for (const name of ['missing', 'invalid']) {
      const { context, page, requests } = await session(name)
      try {
        const disabledWebsite = page.getByRole('button', { name: 'Xem website', exact: true })
        assert.equal(await disabledWebsite.isDisabled(), true)
        assert.ok((await disabledWebsite.getAttribute('title')).includes('VITE_PUBLIC_SITE_URL'))
        assert.equal(await page.getByRole('link', { name: 'Xem website', exact: true }).count(), 0)
        await page.getByRole('button', { name: 'Máy Phân Tích PAC', exact: true }).click()
        assert.equal(await page.getByRole('button', { name: 'Xem trang sản phẩm trên website' }).isDisabled(), true)
        await page.getByRole('button', { name: 'Tin Tức & Sự Kiện', exact: true }).click()
        assert.equal(await page.getByRole('button', { name: 'Xem bài viết trên website' }).isDisabled(), true)
        await page.getByRole('button', { name: 'Cấu Hình API', exact: true }).click()
        assert.ok((await page.locator('main').textContent()).includes('Chưa cấu hình VITE_PUBLIC_SITE_URL hợp lệ'))
        await clickDestination(page, page.getByRole('link', { name: 'Mở Swagger OpenAPI UI', exact: true }), origin + '/api/docs')
        assert.ok(requests.every(r => r.origin === origin), 'Missing API env retains original same-origin contract')
        await page.screenshot({ path: path.join(output, `public-config-${name}.png`) })
      } finally { await context.close() }
    }
  })
  await test('T9', 'Configured API keeps login/session/edit/save/delete/logout working', async () => {
    const { context, page, requests } = await session('configured')
    try {
      await page.reload({ waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: 'Tổng Quan Hệ Thống', exact: true }).waitFor()
      assert.ok(requests.some(r => r.path === '/api/auth/me' && r.bearer))
      await page.getByRole('button', { name: 'Máy Phân Tích PAC', exact: true }).click()
      await page.locator('button[title="Sửa máy"]').click()
      await page.locator('input[placeholder="VD: AC NGA GPA 2286 Extended..."]').fill('QA Machine Edited')
      await page.locator('.modal-dialog button:has-text("Lưu Thay Đổi")').click()
      await page.locator('.modal-dialog').waitFor({ state: 'detached' })
      assert.ok((await page.locator('.data-table tbody').textContent()).includes('QA Machine Edited'))
      page.on('dialog', dialog => dialog.accept())
      await page.locator('button[title="Xóa máy"]').click()
      await page.waitForFunction(() => !document.querySelector('.data-table tbody')?.textContent.includes('QA Machine Edited'))
      const writes = requests.filter(r => r.method !== 'GET' && r.path !== '/api/auth/login')
      assert.deepEqual(writes.map(r => r.method), ['PUT', 'DELETE'])
      assert.ok(writes.every(r => r.origin === 'https://api.qa.example' && r.bearer))
      proof.mutations = writes
      await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor()
      assert.equal(await page.evaluate(() => sessionStorage.getItem('ltvn_admin_session')), null)
    } finally { await context.close() }
  })
  assert.deepEqual(pageErrors, [], 'No browser JS crashes')
  assert.deepEqual(unexpectedRequests, [], 'Every API endpoint explicitly mocked')
  console.log('\nQA-15: 9/9 PASS; 0 production clickable hardcoded loopback URLs; network mocked; migration NOT EXECUTED')
} finally {
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ passed: results.filter(r => r.result === 'PASS').length, total: 9, results, proof, pageErrors, unexpectedRequests }, null, 2) + '\n')
  await browser.close()
  await new Promise(resolve => server.close(resolve))
  for (const [key, value] of savedEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}
