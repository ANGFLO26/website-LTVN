import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Serve the admin build and intercept all API calls. Never contact a real database.
const dist = path.resolve('admin/dist');
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  let file = path.resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403); res.end(); return; }
  try { if (!(await stat(file)).isFile()) file = path.join(dist, 'index.html'); }
  catch { file = path.join(dist, 'index.html'); }
  try {
    res.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const user = { id: randomUUID(), email: 'admin@ltvietnam.com.vn', fullName: 'QA Admin', role: 'admin' };
const password = randomBytes(24).toString('base64url');
const token = randomBytes(32).toString('base64url');

const pass = (label) => console.log(`PASS: ${label}`);

const SAMPLE_LEGACY_ARTICLE = {
  id: 'e0000001-0000-4000-8000-000000000001',
  type: 'news',
  title: 'Legacy Tin Tức Tiếng Việt',
  slug: 'legacy-tin-tuc-tieng-viet',
  shortDescription: 'Mô tả ngắn tin tức',
  content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Nội dung cũ' } }] },
  location: 'Hà Nội',
  status: 'published',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const SAMPLE_BILINGUAL_ARTICLE = {
  id: 'e0000002-0000-4000-8000-000000000002',
  type: 'event',
  title: 'Hội Thảo Song Ngữ',
  slug: 'hoi-thao-song-ngu',
  shortDescription: 'Tóm tắt VI',
  content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Chi tiết VI' } }] },
  location: 'TP.HCM',
  status: 'published',
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  translations: {
    vi: {
      title: 'Hội Thảo Song Ngữ',
      slug: 'hoi-thao-song-ngu',
      shortDescription: 'Tóm tắt VI',
      content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Chi tiết VI' } }] },
      location: 'TP.HCM',
      seoTitle: 'SEO VI',
      seoDescription: 'Desc VI',
    },
    en: {
      title: 'Bilingual Seminar',
      slug: 'bilingual-seminar',
      shortDescription: 'Summary EN',
      content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Detail EN' } }] },
      location: 'HCMC',
      seoTitle: 'SEO EN',
      seoDescription: 'Desc EN',
    },
  },
};

async function createAdminSession(routeHandler) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "UTC" });
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api')) return route.continue();

    if (url.pathname === '/api/auth/login') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user, accessToken: token, expiresAt: Date.now() + 3600000 }),
      });
    }
    if (url.pathname === '/api/auth/me') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (url.pathname === '/api') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    }
    if (url.pathname === '/api/admin/media' || url.pathname === '/api/media') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (url.pathname === '/api/admin/contacts' || url.pathname === '/api/contacts') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    if (url.pathname === '/api/users') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
    return routeHandler(route, req, url);
  });

  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('heading', { name: 'Tổng Quan Hệ Thống', exact: true }).waitFor();
  return { context, page };
}

try {
  let stored = [];
  const requests = [];
  const { context, page } = await createAdminSession(async (route, req, url) => {
    if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stored) });
    }
    if (url.pathname.startsWith('/api/news-events') && ['POST','PUT'].includes(req.method())) {
      const payload = JSON.parse(req.postData());
      requests.push({ method: req.method(), payload });
      stored = [{ ...SAMPLE_LEGACY_ARTICLE, type: 'event', eventEndAt: null, ...stored[0], ...payload }];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stored[0]) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
  await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
  const modal = page.locator('.modal-dialog');
  await modal.locator('select').nth(0).selectOption('event');
  await modal.locator('input[placeholder*="Hội thảo"]').fill('Audit event end date');
  const dates = modal.locator('input[type="datetime-local"]');
  await dates.nth(0).fill('2026-11-11T09:00');
  await dates.nth(1).fill('2026-11-11T11:45');
  assert.equal(await dates.nth(1).inputValue(), '2026-11-11T11:45');
  await page.screenshot({ path: 'artifacts/final-01-2026-10-03/event-end-entered.png' });
  const createResponse = page.waitForResponse(r => r.url().endsWith('/api/news-events') && r.request().method() === 'POST');
  await modal.locator('button:has-text("Lưu Xuất Bản")').click();
  await createResponse;
  await modal.waitFor({ state: 'hidden' });
  assert.equal(requests[0].payload.eventStartAt, '2026-11-11T09:00:00.000Z');
  assert.equal(Object.hasOwn(requests[0].payload, 'eventEndAt'), false);
  await page.locator('button[title="Sửa bài"]').first().click();
  await modal.waitFor();
  const afterCreate = await dates.nth(1).inputValue();
  assert.equal(afterCreate, '');
  await dates.nth(1).fill('2026-11-12T12:45');
  const editResponse = page.waitForResponse(r => r.url().includes('/api/news-events/') && r.request().method() === 'PUT');
  await modal.locator('button:has-text("Lưu Xuất Bản")').click();
  await editResponse;
  await modal.waitFor({ state: 'hidden' });
  assert.equal(Object.hasOwn(requests[1].payload, 'eventEndAt'), false);
  await page.locator('button[title="Sửa bài"]').first().click();
  await modal.waitFor();
  const afterEdit = await dates.nth(1).inputValue();
  assert.equal(afterEdit, '');
  const finding = {
    id: 'FINAL-01-B1', severity: 'P1', environment: 'Production Admin build; Chromium UTC; all API requests intercepted; no DB',
    expected: 'Entered eventEndAt is included in POST and PUT, then retained on reopen',
    actual: 'POST and PUT omit eventEndAt; success closes modal; reopen loses the entered end date',
    enteredCreate: '2026-11-11T11:45', enteredEdit: '2026-11-12T12:45', afterCreate, afterEdit, requests,
  };
  await (await import('node:fs/promises')).writeFile('artifacts/final-01-2026-10-03/event-end-proof.json', JSON.stringify(finding,null,2));
  console.log('CONFIRMED FINAL-01-B1: eventEndAt is dropped from both POST and PUT; date is lost on reopen.');
  await context.close();
} finally { await browser.close(); server.close(); }
