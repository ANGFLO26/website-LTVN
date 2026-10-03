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
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
  // T1 — Legacy article edit
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_LEGACY_ARTICLE]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.locator('main h1:has-text("Quản Lý Tin Tức & Sự Kiện")').waitFor();

    await page.locator('button[title="Sửa bài"]').first().click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    // VI tab is active and prefilled from legacy fields
    const viTitle = modal.locator('input[placeholder*="Hội thảo"]').first();
    assert.equal(await viTitle.inputValue(), 'Legacy Tin Tức Tiếng Việt');

    // Switch to English tab
    await modal.locator('button.tab-pill:has-text("English")').click();
    const enTitle = modal.locator('input[placeholder*="Technical Seminar"]').first();
    assert.equal(await enTitle.inputValue(), '', 'EN title must be empty for legacy article');

    await context.close();
    pass('T1 — Legacy article edit: VI prefilled, EN empty, no crash');
  }

  // T2 — Bilingual article edit
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_BILINGUAL_ARTICLE]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.locator('main h1:has-text("Quản Lý Tin Tức & Sự Kiện")').waitFor();

    await page.locator('button[title="Sửa bài"]').first().click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    // VI tab populated
    const viTitle = modal.locator('input[placeholder*="Hội thảo"]').first();
    assert.equal(await viTitle.inputValue(), 'Hội Thảo Song Ngữ');

    // Switch to EN tab
    await modal.locator('button.tab-pill:has-text("English")').click();
    const enTitle = modal.locator('input[placeholder*="Technical Seminar"]').first();
    assert.equal(await enTitle.inputValue(), 'Bilingual Seminar');

    await context.close();
    pass('T2 — Bilingual article edit: both VI and EN tabs populated correctly');
  }

  // T3 — Tab state retention
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.locator('main h1:has-text("Quản Lý Tin Tức & Sự Kiện")').waitFor();

    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    const viTitle = modal.locator('input[placeholder*="Hội thảo"]').first();
    await viTitle.fill('Tiêu đề VI chưa lưu');

    // Switch to EN
    await modal.locator('button.tab-pill:has-text("English")').click();
    const enTitle = modal.locator('input[placeholder*="Technical Seminar"]').first();
    await enTitle.fill('English title unsaved');

    // Switch back to VI
    await modal.locator('button.tab-pill:has-text("Tiếng Việt")').click();
    assert.equal(await viTitle.inputValue(), 'Tiêu đề VI chưa lưu', 'VI input must be retained when switching tabs');

    // Switch back to EN
    await modal.locator('button.tab-pill:has-text("English")').click();
    assert.equal(await enTitle.inputValue(), 'English title unsaved', 'EN input must be retained when switching tabs');

    await context.close();
    pass('T3 — Tab state retention: unsaved values preserved on tab switch');
  }

  // T4 — Create VI-only
  {
    let capturedBody = null;
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (url.pathname === '/api/news-events' && req.method() === 'POST') {
        capturedBody = JSON.parse(req.postData());
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'e0000003-0000-4000-8000-000000000003',
            ...capturedBody,
            translations: {
              vi: capturedBody.translations?.vi,
              en: null,
            },
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    await modal.locator('input[placeholder*="Hội thảo"]').first().fill('Bài Viết Mới VI Only');
    await modal.locator('button:has-text("Lưu Xuất Bản")').click();

    await page.waitForTimeout(500);
    assert.ok(capturedBody !== null, 'POST /api/news-events must have been called');
    assert.equal(capturedBody.translations?.vi?.title, 'Bài Viết Mới VI Only');
    assert.equal(capturedBody.translations?.en, undefined, 'No fake EN translation should be sent');
    assert.equal(await modal.isVisible(), false, 'Modal should close on success');

    await context.close();
    pass('T4 — Create VI-only: payload has VI, no fake EN, success closes modal');
  }

  // T5 — Create VI+EN
  {
    let capturedBody = null;
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (url.pathname === '/api/news-events' && req.method() === 'POST') {
        capturedBody = JSON.parse(req.postData());
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'e0000004-0000-4000-8000-000000000004',
            ...capturedBody,
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    await modal.locator('input[placeholder*="Hội thảo"]').first().fill('Bài Viết Song Ngữ');
    await modal.locator('button.tab-pill:has-text("English")').click();
    await modal.locator('input[placeholder*="Technical Seminar"]').first().fill('Bilingual Article');

    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(500);

    assert.ok(capturedBody !== null, 'POST must be called');
    assert.equal(capturedBody.translations?.vi?.title, 'Bài Viết Song Ngữ');
    assert.equal(capturedBody.translations?.en?.title, 'Bilingual Article');
    assert.equal(capturedBody.title, 'Bài Viết Song Ngữ', 'Legacy parent title should mirror VI');
    assert.equal(await modal.isVisible(), false, 'Modal should close on success');

    await context.close();
    pass('T5 — Create VI+EN: payload authored VI+EN exactly, legacy mirrored');
  }

  // T6 — Missing VI title
  {
    let apiCalled = false;
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (url.pathname === '/api/news-events') {
        apiCalled = true;
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    // Leave title empty and click save
    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(300);

    assert.equal(apiCalled, false, 'API must not be called when VI title is missing');
    assert.equal(await modal.isVisible(), true, 'Modal must remain open');
    const errorAlert = modal.locator('.modal-error-alert');
    assert.equal(await errorAlert.isVisible(), true, 'Error alert must be visible');
    assert.ok((await errorAlert.textContent()).includes('Tiêu đề Tiếng Việt là bắt buộc'));

    await context.close();
    pass('T6 — Missing VI title: blocked locally, validation visible, modal stays open');
  }

  // T7 — Partial EN without title
  {
    let apiCalled = false;
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (url.pathname === '/api/news-events') {
        apiCalled = true;
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    await modal.locator('input[placeholder*="Hội thảo"]').first().fill('Bài Viết VI Hợp Lệ');
    // Switch to EN and only fill short description, leaving title empty
    await modal.locator('button.tab-pill:has-text("English")').click();
    const enShortDesc = modal.locator('textarea:visible').first();
    await enShortDesc.fill('Some english summary without title');

    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(300);

    assert.equal(apiCalled, false, 'API must not be called with partial EN lacking title');
    assert.equal(await modal.isVisible(), true, 'Modal must stay open');
    const errorAlert = modal.locator('.modal-error-alert');
    assert.equal(await errorAlert.isVisible(), true);
    assert.ok((await errorAlert.textContent()).includes('Vui lòng nhập Tiêu đề tiếng Anh'));

    await context.close();
    pass('T7 — Partial EN without title: blocked locally, EN validation visible');
  }

  // T8 — Existing EN cleared
  {
    let apiCalled = false;
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_BILINGUAL_ARTICLE]) });
      }
      if (url.pathname.startsWith('/api/news-events')) {
        apiCalled = true;
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.locator('button[title="Sửa bài"]').first().click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    // Switch to EN and clear title
    await modal.locator('button.tab-pill:has-text("English")').click();
    const enTitle = modal.locator('input[placeholder*="Technical Seminar"]').first();
    await enTitle.fill('');

    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(300);

    assert.equal(apiCalled, false, 'Cannot silently delete existing EN by clearing title');
    assert.equal(await modal.isVisible(), true, 'Modal must stay open');
    const errorAlert = modal.locator('.modal-error-alert');
    assert.equal(await errorAlert.isVisible(), true);
    assert.ok((await errorAlert.textContent()).includes('Không thể để trống tiêu đề tiếng Anh'));

    await context.close();
    pass('T8 — Existing EN cleared: prevented, validation error blocks save');
  }

  // T9 — Invalid content JSON
  {
    let apiCalled = false;
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (url.pathname.startsWith('/api/news-events')) {
        apiCalled = true;
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    await modal.locator('input[placeholder*="Hội thảo"]').first().fill('Bài Viết Test JSON');
    // Fill invalid JSON in VI content textarea
    const contentTextarea = modal.locator('textarea[style*="monospace"]').first();
    await contentTextarea.fill('{"version": 1, invalid-json: true');

    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(300);

    assert.equal(apiCalled, false, 'Invalid JSON must block API call');
    assert.equal(await modal.isVisible(), true, 'Modal must stay open');
    const errorAlert = modal.locator('.modal-error-alert');
    assert.equal(await errorAlert.isVisible(), true);
    assert.ok((await errorAlert.textContent()).includes('JSON'));

    await context.close();
    pass('T9 — Invalid content JSON: local error, no API request, modal stays open');
  }

  // T10 — 409 duplicate slug
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (url.pathname === '/api/news-events' && req.method() === 'POST') {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 409, message: 'Slug "hoi-thao-lng" already exists in translations' }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    const viTitle = modal.locator('input[placeholder*="Hội thảo"]').first();
    await viTitle.fill('Hội thảo LNG');
    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(500);

    // Modal stays open, values retained, error alert shown
    assert.equal(await modal.isVisible(), true);
    assert.equal(await viTitle.inputValue(), 'Hội thảo LNG');
    const errorAlert = modal.locator('.modal-error-alert');
    assert.equal(await errorAlert.isVisible(), true);
    assert.ok((await errorAlert.textContent()).includes('already exists'));

    await context.close();
    pass('T10 — 409 duplicate slug: error banner shown, modal stays, form values retained');
  }

  // T11 — HTTP 500
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (url.pathname === '/api/news-events' && req.method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 500, message: 'Database connection failed' }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    await modal.locator('input[placeholder*="Hội thảo"]').first().fill('Bài Viết Lỗi 500');
    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(500);

    assert.equal(await modal.isVisible(), true);
    const errorAlert = modal.locator('.modal-error-alert');
    assert.equal(await errorAlert.isVisible(), true);
    assert.ok((await errorAlert.textContent()).includes('Database connection failed'));

    await context.close();
    pass('T11 — HTTP 500: QA-04 error semantics preserved, modal stays open');
  }

  // T12 — network error
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      if (url.pathname === '/api/news-events' && req.method() === 'POST') {
        return route.abort('failed');
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    await modal.locator('input[placeholder*="Hội thảo"]').first().fill('Bài Viết Lỗi Mạng');
    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(500);

    assert.equal(await modal.isVisible(), true);
    const errorAlert = modal.locator('.modal-error-alert');
    assert.equal(await errorAlert.isVisible(), true);

    await context.close();
    pass('T12 — Network error: modal stays open, form intact, error displayed');
  }

  // T13 — successful EN-only edit
  {
    let capturedBody = null;
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_BILINGUAL_ARTICLE]) });
      }
      if (url.pathname.startsWith('/api/news-events/') && req.method() === 'PUT') {
        capturedBody = JSON.parse(req.postData());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...SAMPLE_BILINGUAL_ARTICLE,
            ...capturedBody,
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.locator('button[title="Sửa bài"]').first().click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    // Switch to EN tab and modify title
    await modal.locator('button.tab-pill:has-text("English")').click();
    const enTitle = modal.locator('input[placeholder*="Technical Seminar"]').first();
    await enTitle.fill('Updated English Seminar 2026');

    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(500);

    assert.ok(capturedBody !== null, 'PUT must be called');
    assert.equal(capturedBody.translations?.vi?.title, 'Hội Thảo Song Ngữ', 'VI must be preserved');
    assert.equal(capturedBody.translations?.en?.title, 'Updated English Seminar 2026', 'EN must be updated');
    assert.equal(await modal.isVisible(), false, 'Modal should close on success');

    await context.close();
    pass('T13 — Successful EN-only edit: VI preserved, authored EN saved');
  }

  // T14 — translation indicators
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([SAMPLE_LEGACY_ARTICLE, SAMPLE_BILINGUAL_ARTICLE]),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.locator('main h1:has-text("Quản Lý Tin Tức & Sự Kiện")').waitFor();

    const badges = page.locator('.translation-status-badge');
    assert.equal(await badges.count(), 2);
    assert.equal(await badges.nth(0).textContent(), 'VI ✓ · EN Thiếu');
    assert.equal(await badges.nth(1).textContent(), 'VI ✓ · EN ✓');

    await context.close();
    pass('T14 — Translation indicators: "VI ✓ · EN Thiếu" and "VI ✓ · EN ✓" rendered accurately');
  }

  // T15 — no flags
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_BILINGUAL_ARTICLE]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.locator('button[title="Sửa bài"]').first().click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    // Check page and modal text for any country flag characters
    const fullHtml = await page.content();
    const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/;
    assert.equal(flagRegex.test(fullHtml), false, 'Page must not contain any flag emojis');

    await context.close();
    pass('T15 — No flags: country flags strictly avoided in language tabs and badges');
  }

  // T16 — no auto translation
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.getByRole('button', { name: 'Tạo Bài Mới' }).click();
    const modal = page.locator('.modal-dialog');
    await modal.waitFor();

    const viTitle = modal.locator('input[placeholder*="Hội thảo"]').first();
    await viTitle.fill('Công nghệ phân tích độ chưng cất tự động');

    // Switch to EN tab
    await modal.locator('button.tab-pill:has-text("English")').click();
    const enTitle = modal.locator('input[placeholder*="Technical Seminar"]').first();
    assert.equal(await enTitle.inputValue(), '', 'English title must remain strictly blank, no auto-translation');

    await context.close();
    pass('T16 — No auto translation: EN fields remain completely blank when VI title is entered');
  }

  console.log('\nALL 16 BROWSER TESTS (T1 - T16) PASSED SUCCESSFULLY!');
} finally {
  await browser.close();
  server.close();
}
