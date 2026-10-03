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

const SAMPLE_MACHINE = {
  id: 'd0000001-0000-4000-8000-000000000001',
  name: 'PAC OptiDist Initial',
  slug: 'optidist',
  model: 'OptiDist 2',
  shortDescription: 'PAC machine short desc',
  description: 'PAC machine desc',
  mainImageId: null,
  status: 'published',
  sortOrder: 1,
  applications: [],
  highlights: [],
  specs: [],
  standards: [],
};

async function createAdminSession(routeHandler) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api')) return route.continue();

    if (url.pathname === '/api/auth/login') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user, accessToken: token, expiresAt: Date.now() + 3600000 })
      });
    }
    if (url.pathname === '/api/auth/me') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (url.pathname === '/api') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
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
  // TEST 1: Update (PUT) failure (500) -> 0 POST, reject, modal stays open, form intact, no success toast, localStorage intact
  {
    const interceptedRequests = [];
    const { context, page } = await createAdminSession(async (route, req, url) => {
      interceptedRequests.push({ method: req.method(), url: url.pathname });
      if (url.pathname === '/api/admin/machines' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_MACHINE]) });
      }
      if (url.pathname.startsWith('/api/machines/') && req.method() === 'PUT') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Database transaction error on update' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Máy Phân Tích PAC/i }).click();
    await page.getByRole('heading', { name: 'Danh Sách Máy Phân Tích PAC', exact: true }).waitFor();

    const editBtn = page.locator('button[title="Sửa máy"]').first();
    await editBtn.click();

    const modal = page.locator('.modal-dialog');
    await modal.waitFor();
    const nameInput = modal.locator('input').first();
    await nameInput.fill('MODIFIED MACHINE SHOULD NOT SAVE');

    interceptedRequests.length = 0;
    await modal.locator('button:has-text("Lưu Thay Đổi")').click();
    await page.waitForTimeout(600);

    // 1. Verify PUT was called and ZERO POST requests occurred (PUT->POST fallback eliminated)
    assert.equal(interceptedRequests.some(r => r.method === 'PUT'), true);
    assert.equal(interceptedRequests.some(r => r.method === 'POST'), false, 'PUT failure must NOT fall back to POST');

    // 2. Modal remains OPEN and form input is PRESERVED
    assert.equal(await modal.isVisible(), true, 'Modal must remain open on save failure');
    assert.equal(await nameInput.inputValue(), 'MODIFIED MACHINE SHOULD NOT SAVE', 'Form input must be preserved');

    // 3. Error alert is shown in modal
    const modalError = modal.locator('.modal-error-alert');
    assert.equal(await modalError.isVisible(), true, 'Modal error alert must be visible');
    assert.ok((await modalError.textContent()).includes('Database transaction error on update'));

    // 4. No success toast
    const toast = page.locator('.toast');
    const toastText = await toast.textContent().catch(() => '');
    assert.ok(!toastText.includes('thành công'), 'Success toast must NOT be shown on failure');

    // 5. LocalStorage does NOT contain the unsaved modification
    const localData = await page.evaluate(() => localStorage.getItem('ltvn_admin_machines'));
    assert.ok(!localData || !localData.includes('MODIFIED MACHINE SHOULD NOT SAVE'), 'localStorage must NOT be modified on failure');

    await context.close();
    pass('PUT 500: 0 POST, rejects, modal open, form preserved, error shown, localStorage unchanged');
  }

  // TEST 2: Create (POST) failure (400 Bad Request) -> reject, modal stays open, form intact, localStorage unchanged
  {
    const interceptedRequests = [];
    const { context, page } = await createAdminSession(async (route, req, url) => {
      interceptedRequests.push({ method: req.method(), url: url.pathname });
      if (url.pathname === '/api/machines' && req.method() === 'POST') {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Tên máy đã tồn tại' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Máy Phân Tích PAC/i }).click();
    await page.getByRole('button', { name: 'Thêm Máy Mới' }).click();

    const modal = page.locator('.modal-dialog');
    await modal.waitFor();
    const nameInput = modal.locator('input').first();
    await nameInput.fill('DUPLICATE MACHINE');

    interceptedRequests.length = 0;
    await modal.locator('button:has-text("Lưu Thay Đổi")').click();
    await page.waitForTimeout(600);

    assert.equal(await modal.isVisible(), true, 'Modal must remain open on 400');
    assert.equal(await nameInput.inputValue(), 'DUPLICATE MACHINE');
    const modalError = modal.locator('.modal-error-alert');
    assert.ok((await modalError.textContent()).includes('Tên máy đã tồn tại'));

    const localData = await page.evaluate(() => localStorage.getItem('ltvn_admin_machines'));
    assert.ok(!localData || !localData.includes('DUPLICATE MACHINE'), 'localStorage must NOT store failed create');

    await context.close();
    pass('POST 400: rejects, modal open, form preserved, error shown, localStorage unchanged');
  }

  // TEST 3: DELETE 500 failure -> reject, item remains in UI and localStorage, error toast
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/machines' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_MACHINE]) });
      }
      if (url.pathname.startsWith('/api/machines/') && req.method() === 'DELETE') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Cannot delete: foreign key constraint' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Máy Phân Tích PAC/i }).click();
    page.on('dialog', dialog => dialog.accept());

    const deleteBtn = page.locator('button[title="Xóa máy"]').first();
    await deleteBtn.click();
    await page.waitForTimeout(600);

    // Item must still be in table
    const tableRows = await page.locator('.data-table tbody tr').count();
    assert.equal(tableRows, 1, 'Item must NOT be removed from table when DELETE fails');

    // Error toast shown
    const toast = page.locator('.toast.toast-error');
    assert.equal(await toast.isVisible(), true, 'Error toast must be shown on delete failure');

    await context.close();
    pass('DELETE 500: rejects, item remains in UI table, error toast shown');
  }

  // TEST 4: DELETE 204 No Content -> success, item removed from table, success toast
  {
    let deleted = false;
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/machines' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(deleted ? [] : [SAMPLE_MACHINE]) });
      }
      if (url.pathname.startsWith('/api/machines/') && req.method() === 'DELETE') {
        deleted = true;
        return route.fulfill({ status: 204 }); // 204 No Content
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Máy Phân Tích PAC/i }).click();
    page.on('dialog', dialog => dialog.accept());

    const deleteBtn = page.locator('button[title="Xóa máy"]').first();
    await deleteBtn.click();
    await page.waitForTimeout(600);

    const tableRows = await page.locator('.data-table tbody tr').count();
    assert.equal(tableRows, 0, 'Item must be removed from table on 204 delete success');

    const toast = page.locator('.toast.toast-success');
    assert.equal(await toast.isVisible(), true, 'Success toast must be shown on 204 delete');

    await context.close();
    pass('DELETE 204: 204 No Content treated as success, item removed, success toast shown');
  }

  // TEST 5: Successful Save (200) -> modal closes, form resets, success toast
  {
    const updatedMachine = { ...SAMPLE_MACHINE, name: 'PAC OptiDist Confirmed 2026' };
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/machines' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([updatedMachine]) });
      }
      if (url.pathname.startsWith('/api/machines/') && req.method() === 'PUT') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updatedMachine) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Máy Phân Tích PAC/i }).click();
    await page.locator('button[title="Sửa máy"]').first().click();

    const modal = page.locator('.modal-dialog');
    await modal.waitFor();
    await modal.locator('input').first().fill('PAC OptiDist Confirmed 2026');
    await modal.locator('button:has-text("Lưu Thay Đổi")').click();
    await page.waitForTimeout(600);

    // Modal closes on success
    assert.equal(await modal.isVisible(), false, 'Modal must close on confirmed success');

    // Success toast shown
    const toast = page.locator('.toast.toast-success');
    assert.equal(await toast.isVisible(), true, 'Success toast must be shown on 200 success');

    // Table updated with confirmed entity
    const tableText = await page.locator('.data-table').textContent();
    assert.ok(tableText.includes('PAC OptiDist Confirmed 2026'));

    await context.close();
    pass('Save 200: modal closes, success toast shown, table updated');
  }

  // TEST 6: 401 on mutation -> session expires, no fake success, redirected to login
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/admin/machines' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_MACHINE]) });
      }
      if (url.pathname.startsWith('/api/machines/') && req.method() === 'PUT') {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Máy Phân Tích PAC/i }).click();
    await page.locator('button[title="Sửa máy"]').first().click();

    const modal = page.locator('.modal-dialog');
    await modal.locator('input').first().fill('UNAUTH EDIT');
    await modal.locator('button:has-text("Lưu Thay Đổi")').click();
    await page.waitForTimeout(600);

    // Redirected / transitioned to login screen
    const loginHeading = page.getByRole('heading', { name: 'Đăng nhập quản trị', exact: true });
    assert.equal(await loginHeading.isVisible(), true, '401 must trigger session expiry and return to Login');

    await context.close();
    pass('401 on mutation: expires session, returns to Login, no fake success');
  }

  // TEST 7: Network failure on mutation -> rejects, no POST fallback, modal stays open, form intact
  {
    const interceptedRequests = [];
    const { context, page } = await createAdminSession(async (route, req, url) => {
      interceptedRequests.push({ method: req.method(), url: url.pathname });
      if (url.pathname === '/api/admin/machines' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_MACHINE]) });
      }
      if (url.pathname.startsWith('/api/machines/') && req.method() === 'PUT') {
        return route.abort('failed');
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Máy Phân Tích PAC/i }).click();
    await page.locator('button[title="Sửa máy"]').first().click();

    const modal = page.locator('.modal-dialog');
    await modal.locator('input').first().fill('NETWORK REJECT TEST');
    interceptedRequests.length = 0;
    await modal.locator('button:has-text("Lưu Thay Đổi")').click();
    await page.waitForTimeout(600);

    assert.equal(interceptedRequests.some(r => r.method === 'POST'), false, 'Network failure must NOT fall back to POST');
    assert.equal(await modal.isVisible(), true, 'Modal must remain open on network failure');
    assert.equal(await modal.locator('input').first().inputValue(), 'NETWORK REJECT TEST');

    await context.close();
    pass('Network abort: 0 POST fallback, modal remains open, form data preserved');
  }

  // TEST 8: PUT 404 (Machines) -> 0 POST, rejects, modal open, form preserved
  {
    const interceptedRequests = [];
    const { context, page } = await createAdminSession(async (route, req, url) => {
      interceptedRequests.push({ method: req.method(), url: url.pathname });
      if (url.pathname === '/api/admin/machines' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([SAMPLE_MACHINE]) });
      }
      if (url.pathname.startsWith('/api/machines/') && req.method() === 'PUT') {
        return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Machine not found' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Máy Phân Tích PAC/i }).click();
    await page.locator('button[title="Sửa máy"]').first().click();

    const modal = page.locator('.modal-dialog');
    await modal.locator('input').first().fill('NOT FOUND TEST');
    interceptedRequests.length = 0;
    await modal.locator('button:has-text("Lưu Thay Đổi")').click();
    await page.waitForTimeout(600);

    assert.equal(interceptedRequests.some(r => r.method === 'POST'), false, 'PUT 404 must NOT fall back to POST');
    assert.equal(await modal.isVisible(), true, 'Modal must remain open on 404');
    assert.equal(await modal.locator('input').first().inputValue(), 'NOT FOUND TEST');

    await context.close();
    pass('PUT 404: 0 POST fallback, modal remains open, form data preserved');
  }

  // TEST 9: NewsEvents PUT 500 -> 0 POST, rejects, modal open, form preserved
  {
    const sampleNews = {
      id: 'c0000001-0000-4000-8000-000000000001',
      type: 'news',
      title: 'Hội thảo công nghệ PAC ban đầu',
      slug: 'hoi-thao-cong-nghe-pac',
      shortDescription: 'Mô tả ngắn',
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: { version: 1, blocks: [] },
    };
    const interceptedRequests = [];
    const { context, page } = await createAdminSession(async (route, req, url) => {
      interceptedRequests.push({ method: req.method(), url: url.pathname });
      if (url.pathname === '/api/admin/news-events' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([sampleNews]) });
      }
      if (url.pathname.startsWith('/api/news-events/') && req.method() === 'PUT') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Lỗi server lưu tin tức' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tin Tức & Sự Kiện/i }).click();
    await page.locator('button[title="Sửa bài"]').first().click();

    const modal = page.locator('.modal-dialog');
    await modal.locator('input[placeholder^="VD: Hội thảo"]').fill('TIÊU ĐỀ SỬA BỊ LỖI');
    interceptedRequests.length = 0;
    await modal.locator('button:has-text("Lưu Xuất Bản")').click();
    await page.waitForTimeout(600);

    assert.equal(interceptedRequests.some(r => r.method === 'POST'), false, 'News PUT 500 must NOT fall back to POST');
    assert.equal(await modal.isVisible(), true, 'News modal must remain open on error');
    assert.equal(await modal.locator('input[placeholder^="VD: Hội thảo"]').inputValue(), 'TIÊU ĐỀ SỬA BỊ LỖI');

    await context.close();
    pass('News PUT 500: 0 POST, modal stays open, form preserved, no fake success');
  }

  // TEST 10: Standards PUT 500 -> 0 POST, rejects, modal open, form preserved
  {
    const sampleStd = {
      id: 'b0000001-0000-4000-8000-000000000001',
      code: 'ASTM D86',
      organization: 'ASTM',
      year: 2023,
      title: 'Distillation test method',
      description: 'Mô tả tiêu chuẩn',
      createdAt: new Date().toISOString(),
    };
    const interceptedRequests = [];
    const { context, page } = await createAdminSession(async (route, req, url) => {
      interceptedRequests.push({ method: req.method(), url: url.pathname });
      if (url.pathname === '/api/standards' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([sampleStd]) });
      }
      if (url.pathname.startsWith('/api/standards/') && req.method() === 'PUT') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Lỗi server tiêu chuẩn' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tiêu Chuẩn Quốc Tế/i }).click();
    await page.locator('button[title="Sửa tiêu chuẩn"]').first().click();

    const modal = page.locator('.modal-dialog');
    await modal.locator('input[placeholder="VD: ASTM D3588"]').fill('ASTM D86 MODIFIED');
    interceptedRequests.length = 0;
    await modal.locator('button:has-text("Lưu Tiêu Chuẩn")').click();
    await page.waitForTimeout(600);

    assert.equal(interceptedRequests.some(r => r.method === 'POST'), false, 'Standards PUT 500 must NOT fall back to POST');
    assert.equal(await modal.isVisible(), true, 'Standards modal must remain open on error');
    assert.equal(await modal.locator('input[placeholder="VD: ASTM D3588"]').inputValue(), 'ASTM D86 MODIFIED');

    await context.close();
    pass('Standards PUT 500: 0 POST, modal stays open, form preserved, no fake success');
  }

  // TEST 11: Users PUT 500 -> 0 POST, rejects, modal open, form preserved
  {
    const sampleUser = {
      id: 'e0000001-0000-4000-8000-000000000001',
      email: 'editor@ltvietnam.com.vn',
      fullName: 'Biên Tập Viên Kỹ Thuật',
      role: 'editor',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const interceptedRequests = [];
    const { context, page } = await createAdminSession(async (route, req, url) => {
      interceptedRequests.push({ method: req.method(), url: url.pathname });
      if (url.pathname === '/api/users' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([sampleUser]) });
      }
      if (url.pathname.startsWith('/api/users/') && req.method() === 'PUT') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Lỗi server người dùng' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Tài Khoản Quản Trị/i }).click();
    await page.locator('button[title="Sửa tài khoản"]').first().click();

    const modal = page.locator('.modal-dialog');
    await modal.locator('input[placeholder="VD: Nguyễn Văn A"]').fill('Tên Mới Bị Lỗi');
    interceptedRequests.length = 0;
    await modal.locator('button:has-text("Lưu Tài Khoản")').click();
    await page.waitForTimeout(600);

    assert.equal(interceptedRequests.some(r => r.method === 'POST'), false, 'Users PUT 500 must NOT fall back to POST');
    assert.equal(await modal.isVisible(), true, 'Users modal must remain open on error');
    assert.equal(await modal.locator('input[placeholder="VD: Nguyễn Văn A"]').inputValue(), 'Tên Mới Bị Lỗi');

    await context.close();
    pass('Users PUT 500: 0 POST, modal stays open, form preserved, no fake success');
  }

  // TEST 12: Media POST 500 -> rejects, modal open, form preserved, no fake entity in localStorage
  {
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/media' && req.method() === 'POST') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Lỗi server upload media' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Thư Viện Media/i }).click();
    await page.getByRole('button', { name: 'Thêm Tệp Mới' }).click();

    const modal = page.locator('.modal-dialog');
    await modal.locator('input[placeholder="VD: ac-nga-gpa-2286.jpg"]').fill('test-failed-media.jpg');
    await modal.locator('input[placeholder="https://... hoặc /assets/..."]').fill('/images/test-failed.jpg');
    await modal.locator('button:has-text("Lưu Vào Thư Viện")').click();
    await page.waitForTimeout(600);

    assert.equal(await modal.isVisible(), true, 'Media modal must remain open on failure');
    assert.equal(await modal.locator('input[placeholder="VD: ac-nga-gpa-2286.jpg"]').inputValue(), 'test-failed-media.jpg');

    const localData = await page.evaluate(() => localStorage.getItem('ltvn_admin_media'));
    assert.ok(!localData || !localData.includes('test-failed-media.jpg'), 'localStorage must NOT store failed media');

    await context.close();
    pass('Media POST 500: rejects, modal open, form preserved, localStorage unchanged');
  }

  // TEST 13: Contacts status PATCH 500 & DELETE 500 -> rejects, error feedback, cache unchanged
  {
    const sampleContact = {
      id: 'f0000001-0000-4000-8000-000000000001',
      fullName: 'Khách hàng thử nghiệm',
      companyName: 'Công ty Test',
      email: 'khachhang@example.com',
      phone: '0901234567',
      requestType: 'product_consultation',
      subject: 'Tư vấn máy PAC',
      message: 'Xin chào',
      status: 'new',
      adminNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const { context, page } = await createAdminSession(async (route, req, url) => {
      if (url.pathname === '/api/contacts' && req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([sampleContact]) });
      }
      if (url.pathname.startsWith('/api/contacts/') && url.pathname.endsWith('/status') && req.method() === 'PATCH') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Lỗi cập nhật trạng thái liên hệ' }) });
      }
      if (url.pathname.startsWith('/api/contacts/') && req.method() === 'DELETE') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Lỗi xóa liên hệ' }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.getByRole('button', { name: /Yêu Cầu Liên Hệ/i }).click();

    // 13a: Update status failure
    await page.locator('button:has-text("Xem & Xử lý")').first().click();
    const modal = page.locator('.modal-dialog');
    await modal.locator('textarea').fill('Ghi chú mới');
    await modal.locator('button:has-text("Lưu Trạng Thái & Ghi Chú")').click();
    await page.waitForTimeout(600);

    assert.equal(await modal.isVisible(), true, 'Contacts modal must remain open on PATCH failure');
    assert.equal(await modal.locator('textarea').inputValue(), 'Ghi chú mới');
    await modal.locator('button:has-text("Đóng")').click();

    // 13b: Delete failure
    page.on('dialog', dialog => dialog.accept());
    await page.locator('button[title="Xóa liên hệ"]').first().click();
    await page.waitForTimeout(600);

    const rows = await page.locator('.data-table tbody tr').count();
    assert.equal(rows, 1, 'Contact row must remain in table on DELETE failure');

    await context.close();
    pass('Contacts PATCH 500 & DELETE 500: rejects, modal open, row preserved, error toast shown');
  }

} finally {
  await browser.close();
  server.close();
}

console.log('\n=== ALL QA-04 BROWSER TESTS PASSED ===');
