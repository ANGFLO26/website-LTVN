import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

// Production Admin only; every API, image and external origin is isolated/mocked.
// --baseline records the current build before source changes, without layout assertions.
const baseline = process.argv.includes('--baseline')
const output = path.resolve('artifacts/final-01-fixes-2026-10-03/qa16')
const dist = path.resolve('admin/dist')
await mkdir(output, { recursive: true })
const results = [], matrix = [], baselineMetrics = [], errors = [], unexpectedRequests = []
const proof = { network: 'external traffic blocked; API mocked', migration: 'NOT EXECUTED', tableScroll: {}, modalScroll: {} }
const server = createServer(async (req, res) => {
  let file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname)
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
const user = { id: randomUUID(), email: 'qa16@example.invalid', fullName: 'QA Responsive Admin', role: 'admin', status: 'active' }
const password = randomBytes(16).toString('base64url'), token = randomBytes(32).toString('base64url')
const standard = { id: randomUUID(), code: 'ASTM QA-16', organization: 'ASTM', year: 2026, title: 'QA responsive standard', description: 'Standard method description' }
const machineId = randomUUID()
const machine = { id: machineId, name: 'QA Responsive Machine', slug: 'qa-responsive-machine', model: 'QA-16', status: 'published',
  shortDescription: 'Desktop priority machine', description: 'Long machine form', mainImageId: null,
  applications: [{ id: randomUUID(), machineId, title: 'Fuel sample analysis', description: 'Application description', sortOrder: 1 }],
  highlights: [{ id: randomUUID(), machineId, title: 'Reliable analysis', description: 'Highlight description', icon: 'Zap', sortOrder: 1 }],
  specs: [{ id: randomUUID(), machineId, groupName: 'Performance', specName: 'Range', specValue: '0–100', unit: 'units', sortOrder: 1 }],
  standards: [{ machineId, standardId: standard.id, standard, note: 'QA method', sortOrder: 1 }], sortOrder: 1 }
const content = text => ({ version: 1, blocks: [{ type: 'paragraph', data: { text } }] })
const article = { id: randomUUID(), type: 'event', title: 'Hội thảo QA Responsive', slug: 'hoi-thao-qa-responsive', status: 'published',
  eventStartAt: '2026-10-04T01:00:00Z', eventEndAt: '2026-10-04T04:00:00Z', publishedAt: '2026-10-03T00:00:00Z', location: 'Hà Nội',
  translations: { vi: { title: 'Hội thảo QA Responsive', slug: 'hoi-thao-qa-responsive', shortDescription: 'Tóm tắt tác giả VI', location: 'Hà Nội', content: content('Nội dung tác giả VI'), seoTitle: 'SEO VI', seoDescription: 'Description VI' },
    en: { title: 'QA Responsive Seminar', slug: 'qa-responsive-seminar', shortDescription: 'Authored EN summary', location: 'Hanoi', content: content('Authored EN body'), seoTitle: 'SEO EN', seoDescription: 'Description EN' } } }
const media = { id: randomUUID(), fileName: 'qa16-' + 'long-filename-'.repeat(12) + '.svg', publicUrl: origin + '/images/qa16.svg', mimeType: 'image/svg+xml', width: 1200, height: 800, sizeBytes: 1024, altText: 'QA responsive media' }
const contact = { id: randomUUID(), fullName: 'QA Customer', companyName: 'QA Company', email: 'long-contact-'.repeat(10) + '@example.invalid', phone: '0901234567', subject: 'QA responsive request', message: 'https://example.invalid/' + 'long-message-'.repeat(30), status: 'new', createdAt: '2026-10-03T00:00:00Z' }
const views = {
  Dashboard: 'Tổng Quan Hệ Thống',
  'Máy Phân Tích PAC': 'Danh Sách Máy Phân Tích PAC',
  'Tin Tức & Sự Kiện': 'Quản Lý Tin Tức & Sự Kiện',
  'Thư Viện Media': 'Thư Viện Hình Ảnh & Media',
  'Tiêu Chuẩn Quốc Tế': 'Danh Mục Tiêu Chuẩn Quốc Tế',
  'Tài Khoản Quản Trị': 'Quản Lý Tài Khoản Quản Trị',
  'Cấu Hình API': 'Cấu Hình Hệ Thống & Kết Nối API',
  'Yêu Cầu Liên Hệ': 'Yêu Cầu Liên Hệ & Báo Giá (Leads)',
}

async function session(width, height) {
  // Fixed CSS viewport, as in the original QA report; no mobile auto-zoom can mask overflow.
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1024, reducedMotion: 'reduce' })
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (url.origin !== origin) return route.abort()
    if (url.pathname === '/images/qa16.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#1e293b"/></svg>' })
    if (!url.pathname.startsWith('/api')) return route.continue()
    if (url.pathname === '/api/auth/login') {
      assert.deepEqual(req.postDataJSON(), { email: user.email, password })
      return route.fulfill({ json: { user, accessToken: token, expiresAt: Date.now() + 3600000 } })
    }
    assert.equal(req.headers().authorization, `Bearer ${token}`)
    const data = { '/api/auth/me': user, '/api': { status: 'ok' }, '/api/admin/machines': [machine], '/api/standards': [standard],
      '/api/media': [media], '/api/admin/news-events': [article], '/api/contacts': [contact], '/api/users': [user] }
    if (req.method() === 'GET' && Object.hasOwn(data, url.pathname)) return route.fulfill({ json: data[url.pathname] })
    unexpectedRequests.push({ path: url.pathname, method: req.method() })
    return route.abort()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(7000)
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(origin, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Đăng nhập quản trị', exact: true }).waitFor()
  return { context, page }
}
async function login(page) {
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.locator('main .page-title h1').waitFor()
  await page.locator('.stat-value').filter({ hasText: '1 / 1' }).waitFor()
}
async function go(page, view) {
  const toggle = page.getByRole('button', { name: 'Mở menu quản trị', exact: true })
  if (await toggle.isVisible()) await toggle.click()
  await page.locator('.sidebar-menu').getByRole('button', { name: new RegExp('^' + view) }).click()
  await page.waitForFunction(expected => document.querySelector('main .page-title h1')?.textContent === expected, views[view])
  await page.evaluate(() => window.scrollTo(0, 0))
}
async function metrics(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }
    }
    const header = document.querySelector('.admin-header')?.getBoundingClientRect()
    return { viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), sidebar: rect('.admin-sidebar'), main: rect('.admin-main'), header: rect('.admin-header'),
      headerClipped: header ? [...document.querySelectorAll('.admin-header button, .admin-header a, .header-title')].some(el => {
        const r = el.getBoundingClientRect(); return r.width > 0 && (r.x < 0 || r.right > innerWidth + 2 || r.bottom > header.bottom + 2)
      }) : false, modal: rect('.modal-dialog'), modalBody: rect('.modal-body') }
  })
}
async function fit(page, label) {
  const m = await metrics(page)
  assert.equal(m.viewport.width, page.viewportSize().width, label + ': viewport must not auto-expand')
  assert.ok(m.documentWidth <= m.viewport.width + 2, `${label}: document ${m.documentWidth} > viewport ${m.viewport.width}`)
  assert.equal(await page.evaluate(() => ['hidden', 'clip'].includes(getComputedStyle(document.documentElement).overflowX)), false, 'No root overflow masking')
  if (!(await page.locator('.modal-dialog').count())) assert.equal(await page.evaluate(() => ['hidden', 'clip'].includes(getComputedStyle(document.body).overflowX)), false, 'No body overflow masking')
  return m
}
async function accessible(locator, page, label, touch = false) {
  await locator.scrollIntoViewIfNeeded()
  const r = await locator.boundingBox(), vp = page.viewportSize()
  assert.ok(r && r.x >= -2 && r.x + r.width <= vp.width + 2 && r.y >= -2 && r.y + r.height <= vp.height + 2, `${label} fits viewport: ${JSON.stringify(r)}`)
  assert.ok(await locator.evaluate(el => {
    const r = el.getBoundingClientRect(), top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return top && (el === top || el.contains(top))
  }), `${label} is not covered`)
  if (touch) assert.ok(r.width >= 40 && r.height >= 40, `${label} has a usable touch target`)
}
async function modalFit(page, label) {
  const m = await fit(page, label)
  assert.ok(m.modal.x >= 0 && m.modal.right <= m.viewport.width + 2 && m.modal.y >= 0 && m.modal.bottom <= m.viewport.height + 2, label + ' modal fits')
  assert.ok(m.modalBody.scrollWidth <= m.modalBody.clientWidth + 2, label + ' body has no clipped horizontal fields')
  for (const el of await page.locator('.modal-body .form-control:visible').all()) {
    const r = await el.boundingBox()
    assert.ok(r.x >= m.modal.x && r.x + r.width <= m.modal.right, label + ' field fits')
  }
  for (const button of await page.locator('.modal-footer button').all()) await accessible(button, page, label + ' footer', true)
  await accessible(page.getByRole('button', { name: 'Đóng hộp thoại', exact: true }), page, label + ' close', true)
  return m
}
async function closeModal(page) { await page.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click(); await page.locator('.modal-dialog').waitFor({ state: 'detached' }) }
async function shot(page, name, fullPage = false) { await page.screenshot({ path: path.join(output, name + '.png'), fullPage }) }
async function settleModal(page) {
  await page.locator('.modal-dialog').waitFor()
  await page.locator('.modal-dialog').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))))
}
async function test(id, name, run) {
  try { await run(); results.push({ id, name, result: 'PASS' }); console.log(`PASS ${id}: ${name}`) }
  catch (e) { results.push({ id, name, result: 'FAIL', error: e.message }); throw e }
}

try {
  if (baseline) {
    for (const [width, height] of [[1440, 900], [768, 900], [375, 812]]) {
      const { context, page } = await session(width, height)
      try {
        const loginMetric = await metrics(page)
        await login(page)
        const dashboard = await metrics(page)
        await shot(page, `baseline-dashboard-${width}`)
        await go(page, 'Máy Phân Tích PAC')
        await page.getByRole('button', { name: 'Thêm Máy Mới', exact: true }).click()
        await settleModal(page)
        const machineModal = await metrics(page)
        await shot(page, `baseline-machine-modal-${width}`)
        await page.keyboard.press('Escape')
        await go(page, 'Tin Tức & Sự Kiện')
        await page.getByRole('button', { name: 'Tạo Bài Mới', exact: true }).click()
        await settleModal(page)
        const newsModal = await metrics(page)
        baselineMetrics.push({ width, height, login: loginMetric, dashboard, machineModal, newsModal })
        console.log(`BASELINE ${width}: sidebar=${dashboard.sidebar.width}, main=${dashboard.main.width}, overflow=${dashboard.overflow}, headerClipped=${dashboard.headerClipped}, machineBody=${machineModal.modalBody.scrollWidth}/${machineModal.modalBody.clientWidth}`)
      } finally { await context.close() }
    }
  } else {
    const { context, page } = await session(375, 812)
    try {
      await test('T1', 'Login fits 375 with accessible inputs/buttons', async () => {
        await fit(page, 'Login 375')
        for (const control of await page.locator('.auth-card input, .auth-card button').all()) await accessible(control, page, 'Login control', true)
        await shot(page, 'login-375')
        await login(page)
      })
      await test('T2', 'Dashboard uses full mobile width without permanent sidebar', async () => {
        const m = await fit(page, 'Dashboard 375')
        assert.equal(Math.round(m.main.width), 375)
        assert.equal(Math.round(m.main.x), 0)
        assert.equal(await page.locator('.admin-sidebar').isVisible(), false)
        assert.equal(await page.locator('.stat-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1)
        await accessible(page.getByRole('button', { name: 'Quản Lý Máy PAC', exact: true }), page, 'Dashboard action', true)
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(page, 'dashboard-375', true)
      })
      await test('T3', 'Drawer opens and closes through X/backdrop/Escape; focus is contained', async () => {
        const toggle = page.getByRole('button', { name: 'Mở menu quản trị', exact: true })
        await accessible(toggle, page, 'Hamburger', true)
        await toggle.click()
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
        assert.equal(await page.locator('.admin-sidebar').isVisible(), true)
        assert.equal(await page.locator('.admin-main').evaluate(el => el.inert), true)
        assert.equal(await page.locator('.admin-main').count(), 1)
        const close = page.getByRole('button', { name: 'Đóng menu quản trị', exact: true })
        await accessible(close, page, 'Close drawer', true)
        assert.equal(await close.evaluate(el => el === document.activeElement), true)
        await page.keyboard.press('Shift+Tab')
        assert.equal(await page.getByRole('button', { name: 'Đăng xuất', exact: true }).evaluate(el => el === document.activeElement), true)
        await page.keyboard.press('Tab')
        assert.equal(await close.evaluate(el => el === document.activeElement), true)
        await shot(page, 'sidebar-open-375')
        await close.click()
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
        assert.equal(await page.locator('.admin-sidebar').isVisible(), false)
        assert.equal(await toggle.evaluate(el => el === document.activeElement), true)
        await toggle.click()
        await page.locator('.sidebar-backdrop').click({ position: { x: 350, y: 300 } })
        assert.equal(await page.locator('.admin-sidebar').isVisible(), false)
        await toggle.click()
        await page.keyboard.press('Escape')
        assert.equal(await page.locator('.admin-sidebar').isVisible(), false)
        assert.equal(await page.locator('.admin-main').evaluate(el => el.inert), false)
        assert.equal(await page.evaluate(() => document.body.style.overflow), '')
      })
      await test('T4', 'Selecting a menu changes the active view and closes the mobile drawer', async () => {
        await go(page, 'Máy Phân Tích PAC')
        assert.equal(await page.locator('.admin-sidebar').isVisible(), false)
        assert.equal(await page.locator('.menu-item.active').textContent(), 'Máy Phân Tích PAC')
        await fit(page, 'Machines navigation')
      })
      await test('T5', 'Machines table scrolls locally; Create/Edit/Delete remain reachable', async () => {
        await fit(page, 'Machines 375')
        const wrapper = page.locator('.table-responsive')
        const scroll = await wrapper.evaluate(el => {
          el.scrollLeft = el.scrollWidth; return { width: el.clientWidth, scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft, overflowX: getComputedStyle(el).overflowX }
        })
        assert.ok(scroll.scrollWidth > scroll.width && scroll.scrollLeft > 0 && scroll.overflowX === 'auto')
        proof.tableScroll.machines = scroll
        await accessible(page.getByRole('button', { name: 'Thêm Máy Mới', exact: true }), page, 'Create machine', true)
        await accessible(page.locator('button[title="Sửa máy"]'), page, 'Edit machine', true)
        await accessible(page.locator('button[title="Xóa máy"]'), page, 'Delete machine', true)
        await wrapper.evaluate(el => { el.scrollLeft = 0 })
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(page, 'machines-375', true)
      })
      await test('T6', 'Machine editor, applications/highlights/specs/standards fit one column', async () => {
        await page.locator('button[title="Sửa máy"]').click()
        await settleModal(page)
        await modalFit(page, 'Machine info')
        assert.equal(await page.locator('.form-row').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1)
        await shot(page, 'machine-modal-375')
        for (const [tab, selector] of [['2. Ứng Dụng', '.editor-fields'], ['3. Điểm Nổi Bật', '.editor-fields'], ['4. Thông Số Kỹ Thuật', '.editor-grid'], ['5. Tiêu Chuẩn', '.editor-grid']]) {
          await page.locator('.sub-tabs button').filter({ hasText: tab }).click()
          await modalFit(page, tab)
          assert.equal(await page.locator(selector).count(), 1, tab + ' fixture row present')
          for (const field of await page.locator(selector + ' .form-control').all()) await accessible(field, page, tab + ' field')
        }
        await closeModal(page)
      })
      await test('T7', 'News list preserves readable translation badge and reachable Create/Edit', async () => {
        await go(page, 'Tin Tức & Sự Kiện')
        await fit(page, 'News 375')
        assert.equal(await page.locator('.translation-status-badge').textContent(), 'VI ✓ · EN ✓')
        await accessible(page.locator('.translation-status-badge'), page, 'Translation badge')
        await accessible(page.getByRole('button', { name: 'Tạo Bài Mới', exact: true }), page, 'Create news', true)
        await accessible(page.locator('button[title="Sửa bài"]'), page, 'Edit news', true)
        await page.locator('.table-responsive').evaluate(el => { el.scrollLeft = 0 })
        await page.evaluate(() => window.scrollTo(0, 0))
        await shot(page, 'news-375', true)
      })
      await test('T8', 'VI/English tabs, JSON and SEO fields fit; authored values survive tab changes', async () => {
        await page.locator('button[title="Sửa bài"]').click()
        await settleModal(page)
        const viTitle = page.getByPlaceholder('VD: Hội thảo kỹ thuật phân tích LNG 2026...', { exact: true })
        const enTitle = page.getByPlaceholder('e.g. Technical Seminar on LNG Analysis 2026...', { exact: true })
        const viJSON = page.locator('.form-group').filter({ hasText: 'Nội Dung JSONB Blocks (Tiếng Việt)' }).locator('textarea')
        const enJSON = page.locator('.form-group').filter({ hasText: 'Content JSONB Blocks (English)' }).locator('textarea')
        const viRaw = JSON.stringify(content('VI mobile authored value')), enRaw = JSON.stringify(content('EN mobile authored value'))
        await viTitle.fill('Tiêu đề VI giữ lại ở mobile')
        await viJSON.fill(viRaw)
        const enTab = page.locator('.modal-body button.tab-pill').filter({ hasText: 'English' })
        const viTab = page.locator('.modal-body button.tab-pill').filter({ hasText: 'Tiếng Việt' })
        await accessible(enTab, page, 'English tab', true)
        await enTab.click()
        assert.equal(await enTitle.inputValue(), article.translations.en.title)
        await enTitle.fill('Retained authored EN mobile title')
        await enJSON.fill(enRaw)
        await page.locator('.form-group').filter({ hasText: 'SEO Title (English' }).locator('input').fill('Mobile authored SEO EN')
        await modalFit(page, 'News English')
        await accessible(viTab, page, 'VI tab', true)
        await viTab.click()
        assert.equal(await viTitle.inputValue(), 'Tiêu đề VI giữ lại ở mobile')
        assert.equal(await viJSON.inputValue(), viRaw)
        await enTab.click()
        assert.equal(await enTitle.inputValue(), 'Retained authored EN mobile title')
        assert.equal(await enJSON.inputValue(), enRaw)
        assert.equal(await page.locator('.form-group').filter({ hasText: 'SEO Title (English' }).locator('input').inputValue(), 'Mobile authored SEO EN')
        assert.equal(await page.locator('.modal-body').evaluate(el => /[\u{1F1E6}-\u{1F1FF}]/u.test(el.textContent)), false)
        await enTab.scrollIntoViewIfNeeded()
        await shot(page, 'news-bilingual-modal-375')
        await closeModal(page)
      })
      await test('T9', 'Media cards and create modal handle long filename/URL without clipping', async () => {
        await go(page, 'Thư Viện Media')
        await fit(page, 'Media 375')
        assert.equal(await page.locator('.media-filename').getAttribute('title'), media.fileName)
        await accessible(page.locator('button[title="Xóa tệp media"]'), page, 'Delete media', true)
        await page.getByRole('button', { name: 'Thêm Tệp Mới', exact: true }).click()
        await settleModal(page)
        await page.getByPlaceholder('https://... hoặc /assets/...').fill(origin + '/images/qa16.svg')
        await modalFit(page, 'Media create')
        await closeModal(page)
      })
      await test('T10', 'Standards/Users/Settings/Contacts pages and forms remain usable', async () => {
        for (const [view, action] of [['Tiêu Chuẩn Quốc Tế', 'Thêm Tiêu Chuẩn'], ['Tài Khoản Quản Trị', 'Thêm Tài Khoản'], ['Cấu Hình API', null], ['Yêu Cầu Liên Hệ', 'Xem & Xử lý']]) {
          await go(page, view)
          await fit(page, view)
          await accessible(page.locator('main .page-title h1'), page, view + ' heading')
          if (action) {
            await page.getByRole('button', { name: action, exact: true }).click()
            await settleModal(page)
            await modalFit(page, view + ' modal')
            await closeModal(page)
          }
        }
      })
      await test('T11', 'Mobile Header controls fit without overlap and preserve QA-15 actions', async () => {
        const header = page.locator('.admin-header')
        const controls = header.locator('button, a')
        for (const el of await controls.all()) if (await el.isVisible()) await accessible(el, page, 'Header control', true)
        const boxes = await header.locator('button, a').evaluateAll(els => els.map(el => el.getBoundingClientRect()).filter(r => r.width > 0).map(r => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom })))
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j]
          assert.ok(a.right <= b.x + 1 || b.right <= a.x + 1 || a.bottom <= b.y + 1 || b.bottom <= a.y + 1, 'Header controls do not overlap')
        }
        assert.equal((await metrics(page)).headerClipped, false)
        assert.equal(await header.getByRole('button', { name: 'Xem website', exact: true }).isDisabled(), true, 'QA-15 missing-env behavior preserved')
        assert.equal(await header.getByRole('link', { name: 'Mở tài liệu Swagger OpenAPI' }).getAttribute('href'), origin + '/api/docs')
        await fit(page, 'Header 375')
      })
      await test('T12', 'Desktop keeps 260px sidebar, groups, active state and two-column form', async () => {
        const current = await session(1440, 900)
        try {
          await login(current.page)
          const m = await fit(current.page, 'Desktop Dashboard')
          assert.equal(m.sidebar.width, 260)
          assert.equal(m.main.width, 1180)
          assert.equal(m.main.x, 260)
          assert.equal(await current.page.locator('.sidebar-toggle').isVisible(), false)
          assert.equal(await current.page.locator('.sidebar-close').isVisible(), false)
          assert.equal(await current.page.locator('.sidebar-backdrop').count(), 0)
          assert.equal(await current.page.locator('.menu-category').count(), 4)
          assert.equal(await current.page.locator('.dashboard-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2)
          await shot(current.page, 'dashboard-desktop-1440')
          await go(current.page, 'Máy Phân Tích PAC')
          assert.equal(await current.page.locator('.menu-item.active').textContent(), 'Máy Phân Tích PAC')
          await current.page.getByRole('button', { name: 'Thêm Máy Mới', exact: true }).click()
          await settleModal(current.page)
          assert.equal(await current.page.locator('.form-row').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2)
          await accessible(current.page.locator('.modal-footer button').last(), current.page, 'Desktop Save')
        } finally { await current.context.close() }
      })
      await test('T13', 'Tablet uses drawer; resize across 1024px resets overlay and scroll lock', async () => {
        const current = await session(768, 900)
        try {
          await login(current.page)
          const m = await fit(current.page, 'Tablet Dashboard')
          assert.equal(m.main.width, 768)
          assert.equal(await current.page.locator('.admin-sidebar').isVisible(), false)
          const toggle = current.page.getByRole('button', { name: 'Mở menu quản trị', exact: true })
          await toggle.click()
          assert.equal(await current.page.locator('.admin-sidebar').isVisible(), true)
          await current.page.setViewportSize({ width: 1024, height: 900 })
          await current.page.waitForFunction(() => !document.querySelector('.admin-main').inert)
          assert.equal(await current.page.locator('.sidebar-backdrop').count(), 0)
          assert.equal(await current.page.evaluate(() => document.body.style.overflow), '')
          assert.equal((await metrics(current.page)).main.x, 260)
          await current.page.setViewportSize({ width: 768, height: 900 })
          await current.page.locator('.sidebar-toggle').waitFor()
          assert.equal(await current.page.locator('.admin-sidebar').isVisible(), false)
          await go(current.page, 'Tin Tức & Sự Kiện')
          await current.page.locator('button[title="Sửa bài"]').click()
          await settleModal(current.page)
          await modalFit(current.page, 'Tablet News modal')
          await shot(current.page, 'news-modal-tablet-768')
        } finally { await current.context.close() }
      })
      await test('T14', 'Long Machine/News forms scroll top-to-bottom while Save/Cancel remain reachable', async () => {
        for (const [view, edit, last] of [['Máy Phân Tích PAC', 'Sửa máy', 'textarea'], ['Tin Tức & Sự Kiện', 'Sửa bài', '.form-control']]) {
          await go(page, view)
          await page.locator(`button[title="${edit}"]`).click()
          await settleModal(page)
          const body = page.locator('.modal-body')
          const dimensions = await body.evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight }))
          assert.ok(dimensions.scroll > dimensions.client)
          await body.evaluate(el => { el.scrollTop = 0 })
          await accessible(page.locator('.modal-body ' + last + ':visible').last(), page, view + ' last field')
          const bottom = await body.evaluate(el => el.scrollTop)
          assert.ok(bottom > 0)
          for (const button of await page.locator('.modal-footer button').all()) await accessible(button, page, view + ' footer', true)
          await body.evaluate(el => { el.scrollTop = 0 })
          assert.equal(await body.evaluate(el => el.scrollTop), 0)
          proof.modalScroll[view] = { ...dimensions, reachedScrollTop: bottom, returnedToTop: true }
          await closeModal(page)
        }
      })
      await test('T15', 'All core pages fit document width at 375/768/1440, including long text fixtures', async () => {
        for (const [width, height] of [[375, 812], [768, 900], [1440, 900]]) {
          const current = await session(width, height)
          try {
            matrix.push({ page: 'Login', width, ...(await fit(current.page, `Login ${width}`)) })
            await login(current.page)
            for (const view of Object.keys(views)) {
              await go(current.page, view)
              const m = await fit(current.page, view + ' ' + width)
              assert.equal(m.headerClipped, false, view + ' header fits')
              await accessible(current.page.locator('main .page-title h1'), current.page, view + ' heading')
              matrix.push({ page: view, width, ...m })
            }
          } finally { await current.context.close() }
        }
      })
      assert.deepEqual(errors, [], 'No JS crash')
      assert.deepEqual(unexpectedRequests, [], 'No unmocked API request or DB mutation')
      console.log('QA-16: 15/15 PASS; viewport matrix 375/768/1440; network isolated; migration NOT EXECUTED')
    } finally { await context.close() }
  }
} finally {
  await writeFile(path.join(output, baseline ? 'baseline.json' : 'results.json'), JSON.stringify({ passed: results.filter(r => r.result === 'PASS').length, total: baseline ? 0 : 15, results, matrix, baselineMetrics, proof, errors, unexpectedRequests }, null, 2) + '\n')
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
