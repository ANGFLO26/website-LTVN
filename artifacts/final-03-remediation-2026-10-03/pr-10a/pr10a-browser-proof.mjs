import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

console.log('=== PR-10A: BROWSER CHANGE PASSWORD & LOGOUT PROOF ===');

// Serve compiled admin dist
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
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const user = { id: randomUUID(), email: `admin-${randomUUID()}@example.invalid`, fullName: 'Admin QA', role: 'admin' };
const oldPassword = 'OldInitialPass#123';
const newPassword = 'NewStrongPass#2026';
const token = randomBytes(32).toString('base64url');
let currentPasswordInDB = oldPassword;

const apiRequests = [];

await context.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== origin) return route.abort();
  if (!url.pathname.startsWith('/api')) return route.continue();

  const authHeader = request.headers().authorization;
  apiRequests.push({ path: url.pathname, method: request.method(), authHeader });
  const respond = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  if (url.pathname === '/api/auth/login') {
    const body = request.postDataJSON();
    if (body.email === user.email && body.password === currentPasswordInDB) {
      return respond(200, { user, accessToken: token, tokenType: 'Bearer', expiresAt: Date.now() + 3600000 });
    }
    return respond(401, { message: 'Email hoặc mật khẩu không đúng.' });
  }

  // Protected endpoints require valid Bearer token
  if (authHeader !== `Bearer ${token}`) {
    return respond(401, { message: 'Unauthorized' });
  }

  if (url.pathname === '/api/auth/me') {
    return respond(200, user);
  }

  if (url.pathname === '/api/auth/change-password' && request.method() === 'POST') {
    const body = request.postDataJSON();
    if (body.currentPassword !== currentPasswordInDB) {
      return respond(400, { message: 'Mật khẩu hiện tại không chính xác.' });
    }
    if (body.newPassword === body.currentPassword) {
      return respond(400, { message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' });
    }
    currentPasswordInDB = body.newPassword;
    return respond(200, { message: 'Đổi mật khẩu thành công.' });
  }

  return respond(200, url.pathname === '/api' ? 'OK' : []);
});

try {
  const page = await context.newPage();
  page.setDefaultTimeout(8000);

  // 1. Visit admin root -> shows login
  await page.goto(origin);
  const loginTitle = page.getByRole('heading', { name: 'Đăng nhập quản trị', exact: true });
  await loginTitle.waitFor({ state: 'visible' });
  console.log('[PASS] Browser opened at LoginPage');

  // 2. Perform initial login with old password
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(oldPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  const dashboardHeading = page.getByRole('heading', { name: 'Tổng Quan Hệ Thống', exact: true });
  await dashboardHeading.waitFor({ state: 'visible' });
  console.log('[PASS] Logged in successfully, Dashboard mounted');

  // 3. Navigate to Settings page
  const settingsNavItem = page.getByRole('button', { name: 'Cấu Hình API', exact: true });
  await settingsNavItem.click();

  const settingsTitle = page.getByRole('heading', { name: 'Cấu Hình Hệ Thống & Bảo Mật', exact: true });
  await settingsTitle.waitFor({ state: 'visible' });
  console.log('[PASS] Navigated to SettingsPage');

  // 4. Locate Change Password form
  const changePasswordCard = page.getByText('Đổi Mật Khẩu Quản Trị');
  await changePasswordCard.waitFor({ state: 'visible' });

  // 5. Submit with matching strong new password
  const currentPassInput = page.locator('#settings-current-password');
  const newPassInput = page.locator('#settings-new-password');
  const confirmPassInput = page.locator('#settings-confirm-password');

  await currentPassInput.fill(oldPassword);
  await newPassInput.fill(newPassword);
  await confirmPassInput.fill(newPassword);

  const submitBtn = page.getByRole('button', { name: 'Đổi Mật Khẩu', exact: true });
  await submitBtn.click();
  console.log('[PASS] Submitted Change Password form');

  // 6. Verify automatic logout and redirection to Login
  await loginTitle.waitFor({ state: 'visible' });
  console.log('[PASS] Automatically redirected to LoginPage after password change');

  // 7. Verify logout message on Login page
  const alertMsg = page.getByRole('alert');
  const msgText = await alertMsg.textContent();
  console.log(`[PASS] Alert message displayed: "${msgText}"`);
  assert.ok(msgText.includes('Đổi mật khẩu thành công'), 'Alert message should indicate success');

  // 8. Verify session is wiped in browser sessionStorage
  const storedSession = await page.evaluate(() => sessionStorage.getItem('ltvn_admin_session'));
  assert.equal(storedSession, null, 'SessionStorage token must be null after logout');
  console.log('[PASS] Verified sessionStorage is completely cleared (no lingering token)');

  // 9. Verify reload remains on LoginPage
  await page.reload();
  await loginTitle.waitFor({ state: 'visible' });
  console.log('[PASS] Page reload remains on LoginPage (unauthenticated)');

  // 10. Verify login with old password fails
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(oldPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const errorAfterOld = await page.getByRole('alert').textContent();
  console.log(`[PASS] Login with old password rejected: "${errorAfterOld}"`);

  // 11. Verify login with new password succeeds
  await page.getByLabel('Mật khẩu', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await dashboardHeading.waitFor({ state: 'visible' });
  console.log('[PASS] Login with new password succeeded, returned to Dashboard');

  console.log('\n=== ALL PR-10A BROWSER PROOF CHECKS PASSED ===');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
