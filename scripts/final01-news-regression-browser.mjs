import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Production bundles only; all API responses are intercepted and external traffic aborted.
const output = path.resolve(process.env.FINAL01_OUTPUT || 'artifacts/final-01-fixes-2026-10-03/browser');
await mkdir(output, { recursive: true });
const results = [];
const pageErrors = [];
const proof = {};
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
async function serve(directory) {
  const dist = path.resolve(directory);
  const server = createServer(async (req, res) => {
    let file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403); res.end(); return; }
    try { if (!(await stat(file)).isFile()) file = path.join(dist, 'index.html'); }
    catch { file = path.join(dist, 'index.html'); }
    try { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(await readFile(file)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}
async function test(id, name, fn) {
  try { await fn(); results.push({ id, name, result: 'PASS' }); console.log(`PASS ${id}: ${name}`); }
  catch (error) { results.push({ id, name, result: 'FAIL', error: error.message }); console.error(`FAIL ${id}: ${error.message}`); }
}
const adminHost = await serve('admin/dist');
const publicHost = await serve('dist');
const browser = await chromium.launch({ headless: true });
try {
  const admin = { id: randomUUID(), email: 'audit@example.invalid', fullName: 'Audit Admin', role: 'admin' };
  const token = randomBytes(32).toString('base64url');
  const password = randomBytes(24).toString('base64url');
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'UTC' });
  let stored = [];
  const requests = [];
  await adminContext.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== adminHost.origin) return route.abort();
    if (!url.pathname.startsWith('/api')) return route.continue();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/auth/login') return json({ user: admin, accessToken: token, expiresAt: Date.now() + 3600000 });
    assert.equal(req.headers().authorization, `Bearer ${token}`);
    if (url.pathname === '/api/auth/me') return json(admin);
    if (url.pathname === '/api') return json({ status: 'ok' });
    if (url.pathname === '/api/admin/news-events') return json(stored);
    if (url.pathname.startsWith('/api/news-events') && ['POST', 'PUT'].includes(req.method())) {
      const payload = req.postDataJSON();
      requests.push({ method: req.method(), payload });
      const defaults = { id: randomUUID(), createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', eventEndAt: null };
      stored = [{ ...defaults, ...stored[0], ...payload }];
      return json(stored[0], req.method() === 'POST' ? 201 : 200);
    }
    return json([]);
  });
  const page = await adminContext.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(adminHost.origin, { waitUntil: 'networkidle' });
  await page.getByLabel('Email', { exact: true }).fill(admin.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('heading', { name: 'Tổng Quan Hệ Thống', exact: true }).waitFor();
  await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
  const modal = page.locator('.modal-dialog');
  const dates = modal.locator('input[type="datetime-local"]');
  async function save(method) {
    const response = page.waitForResponse(r => r.url().includes('/api/news-events') && r.request().method() === method);
    await modal.getByRole('button', { name: 'Lưu Xuất Bản', exact: true }).click();
    await response;
    await modal.waitFor({ state: 'hidden' });
  }
  async function edit() {
    await page.locator('button[title="Sửa bài"]').first().click();
    await modal.waitFor();
  }
  async function close() { await modal.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click(); }

  await test('T1', 'B1 — Create sends and retains the entered end date', async () => {
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    await modal.locator('select').first().selectOption('event');
    await modal.locator('input[placeholder*="Hội thảo"]').fill('Sự kiện kiểm tra ngày kết thúc');
    await dates.nth(0).fill('2026-11-11T09:00');
    await dates.nth(1).fill('2026-11-11T11:45');
    await save('POST');
    assert.equal(requests[0].payload.eventStartAt, '2026-11-11T09:00:00.000Z');
    assert.equal(requests[0].payload.eventEndAt, '2026-11-11T11:45:00.000Z');
    await edit();
    assert.equal(await dates.nth(1).inputValue(), '2026-11-11T11:45');
    await close();
  });
  await test('T2', 'B1 — Edit sends the changed end date and retains it on reopen', async () => {
    await edit();
    await dates.nth(1).fill('2026-11-12T12:45');
    await save('PUT');
    assert.equal(requests.at(-1).payload.eventEndAt, '2026-11-12T12:45:00.000Z');
    await edit();
    assert.equal(await dates.nth(1).inputValue(), '2026-11-12T12:45');
    await page.screenshot({ path: path.join(output, 'event-end-retained.png') });
    await close();
  });
  await test('T3', 'B1 — Clearing end date sends explicit null and stays cleared', async () => {
    await edit();
    await dates.nth(1).fill('');
    await save('PUT');
    assert.equal(requests.at(-1).payload.eventEndAt, null);
    await edit();
    assert.equal(await dates.nth(1).inputValue(), '');
    await close();
  });
  proof.dateRequests = requests;
  await adminContext.close();

  const legacy = { id: randomUUID(), type: 'event', status: 'published', title: 'Sự kiện legacy có địa điểm', slug: 'legacy-event-location',
    shortDescription: 'Tóm tắt legacy VI', location: 'Địa điểm VI legacy cần giữ', createdAt: '2026-10-01T00:00:00Z',
    content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Nội dung VI legacy cần giữ' } }] } };
  let news = [legacy];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('ltv-language', 'vi'));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== publicHost.origin) return route.abort();
    if (!url.pathname.startsWith('/api')) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.pathname === '/api/news-events' ? news : []) });
  });
  const site = await context.newPage();
  site.setDefaultTimeout(8000);
  site.on('pageerror', error => pageErrors.push(error.message));
  async function article(slug) {
    await site.goto(publicHost.origin + '/tin-tuc/' + slug, { waitUntil: 'networkidle' });
    await site.locator('.article-header h1').waitFor();
  }
  await test('T4', 'B3 — Legacy VI location, excerpt and body render without translations', async () => {
    await article(legacy.slug);
    assert.equal(await site.locator('.article-header h1').innerText(), legacy.title);
    assert.equal((await site.locator('.article-location').textContent()).trim(), legacy.location);
    assert.ok((await site.locator('.article-header').innerText()).includes(legacy.shortDescription));
    assert.ok((await site.locator('.article-body').innerText()).includes('Nội dung VI legacy cần giữ'));
    await site.screenshot({ path: path.join(output, 'legacy-location-visible.png') });
  });
  await test('T5', 'B3 — Legacy VI data is unavailable in EN, never rendered as English', async () => {
    await site.locator('.language-switch').getByRole('button', { name: 'EN', exact: true }).click();
    await site.getByRole('heading', { name: 'This article is currently available in Vietnamese only.' }).waitFor();
    assert.equal(await site.locator('html').getAttribute('lang'), 'en');
    assert.equal(await site.locator('.article-body').count(), 0);
    assert.equal((await site.locator('body').textContent()).includes(legacy.location), false);
    await site.getByRole('button', { name: 'Xem bản Tiếng Việt', exact: true }).click();
    await site.locator('.article-location').waitFor();
    assert.equal(await site.locator('html').getAttribute('lang'), 'vi');
    assert.equal(new URL(site.url()).pathname, '/tin-tuc/' + legacy.slug);
    assert.equal((await site.locator('.article-location').textContent()).trim(), legacy.location);
  });
  await test('T6', 'B3 — Authored VI location overrides legacy location', async () => {
    news = [{ ...legacy, slug: 'authored-location', translations: { vi: { title: legacy.title, slug: 'authored-location', location: 'Địa điểm VI authored mới' }, en: null } }];
    await article('authored-location');
    assert.equal((await site.locator('.article-location').textContent()).trim(), 'Địa điểm VI authored mới');
    assert.equal((await site.locator('body').textContent()).includes(legacy.location), false);
  });
  await test('T7', 'B3 — Empty/null authored VI location does not revive stale legacy location', async () => {
    for (const location of [null, '']) {
      news = [{ ...legacy, slug: 'cleared-location', translations: { vi: { title: legacy.title, slug: 'cleared-location', location }, en: null } }];
      await article('cleared-location');
      assert.equal(await site.locator('.article-location').count(), 0);
      assert.equal((await site.locator('body').textContent()).includes(legacy.location), false);
    }
  });
  await test('T8', 'No browser JS crash in the targeted scenarios', async () => { assert.deepEqual(pageErrors, []); });
  await context.close();
} finally {
  await browser.close();
  adminHost.server.close();
  publicHost.server.close();
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ passed: results.filter(r => r.result === 'PASS').length, total: 8, results, proof, pageErrors,
    network: 'API mocked; external traffic aborted', database: 'NOT EXECUTED', migration: 'NOT EXECUTED' },null,2));
}
console.log(`FINAL-01 targeted browser: ${results.filter(r => r.result === 'PASS').length}/8 PASS`);
process.exitCode = results.some(r => r.result === 'FAIL') ? 1 : 0;
