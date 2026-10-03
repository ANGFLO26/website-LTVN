import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

// Isolated Admin build with mocked HTTP; never forwards a request to the real API.
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
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const user = { id: randomUUID(), email: `${randomUUID()}@example.invalid`, fullName: 'QA Admin', role: 'admin' };
const password = randomBytes(24).toString('base64url');
const token = randomBytes(32).toString('base64url');
let lifetime = 60000;
let rejectMutations = false;
const requests = [];
const errors = [];

await context.route('**/*', async route => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== origin) return route.abort();
  if (!url.pathname.startsWith('/api')) return route.continue();
  const authorization = request.headers().authorization;
  requests.push({ path: url.pathname, method: request.method(), authorization });
  const respond = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (url.pathname === '/api/auth/login') {
    const body = request.postDataJSON();
    if (body.email !== user.email || body.password !== password) return respond(401, {});
    return respond(200, { user, accessToken: token, tokenType: 'Bearer', expiresAt: Date.now() + lifetime });
  }
  if (authorization !== `Bearer ${token}`) return respond(401, {});
  if (url.pathname === '/api/auth/me') return respond(200, user);
  if (request.method() !== 'GET' && rejectMutations) return respond(401, {});
  return respond(200, url.pathname === '/api' ? 'Hello World!' : []);
});

const page = await context.newPage();
page.setDefaultTimeout(6000);
page.on('pageerror', error => errors.push(error.message));
const loginHeading = page.getByRole('heading', { name: 'Đăng nhập quản trị', exact: true });
const dashboard = page.getByRole('heading', { name: 'Tổng Quan Hệ Thống', exact: true });
const dataRequests = () => requests.filter(r => !['/api/auth/login', '/api/auth/me', '/api'].includes(r.path));
const pass = label => console.log(`PASS: ${label}`);
async function login(inputPassword = password) {
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(inputPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

try {
  await page.goto(origin, { waitUntil: 'networkidle' });
  await loginHeading.waitFor();
  assert.equal(await dashboard.count(), 0);
  assert.equal(requests.length, 0);
  pass('Unauthenticated gate does not mount Admin or fetch Admin data');

  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await login(randomBytes(24).toString('base64url'));
  await page.getByRole('alert').waitFor();
  assert.equal(dataRequests().length, 0);
  await loginHeading.waitFor();
  pass('Invalid login stays at Login; login form fits mobile');
  await page.setViewportSize({ width: 1280, height: 900 });

  const initialResponses = Promise.all(['/api/users', '/api/admin/machines', '/api/admin/news-events']
    .map(endpoint => page.waitForResponse(r => r.url() === `${origin}${endpoint}`)));
  await login();
  await dashboard.waitFor();
  await initialResponses;
  assert.ok(dataRequests().length > 0);
  assert.ok(dataRequests().every(r => r.authorization === `Bearer ${token}`));
  assert.ok(!dataRequests().some(r => r.method === 'GET' && ['/api/machines', '/api/news-events'].includes(r.path)));
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('ltvn_admin_session')).accessToken), token);
  pass('Valid login opens Admin and sends Bearer to separate Admin content read endpoints');

  requests.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  await dashboard.waitFor();
  assert.equal(requests[0].path, '/api/auth/me');
  assert.equal(requests[0].authorization, `Bearer ${token}`);
  pass('Reload validates /auth/me before loading Admin');

  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await loginHeading.waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('ltvn_admin_session')), null);
  assert.equal(await dashboard.count(), 0);
  await page.reload({ waitUntil: 'networkidle' });
  await loginHeading.waitFor();
  pass('Logout clears token and remains logged out after reload');

  await page.evaluate(({ forged, expiry }) => sessionStorage.setItem('ltvn_admin_session', JSON.stringify({ accessToken: forged, expiresAt: expiry })), { forged: randomBytes(32).toString('base64url'), expiry: Date.now() + 60000 });
  requests.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  await loginHeading.waitFor();
  assert.equal(dataRequests().length, 0);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('ltvn_admin_session')), null);
  pass('Forged stored token is rejected by /auth/me before Admin data is loaded');

  lifetime = 1800;
  await login();
  await dashboard.waitFor();
  await loginHeading.waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('ltvn_admin_session')), null);
  pass('Token expiry returns to Login without waiting for another request');

  lifetime = 60000;
  await login();
  await dashboard.waitFor();
  rejectMutations = true;
  await page.getByRole('button', { name: 'Máy Phân Tích PAC', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm Máy Mới', exact: true }).click();
  await page.locator('.modal-dialog input').first().fill('QA Auth Mutation');
  await page.locator('.modal-footer button').last().click();
  await loginHeading.waitFor();
  assert.ok(requests.some(r => r.path === '/api/machines' && r.method === 'POST' && r.authorization === `Bearer ${token}`));
  assert.equal(await page.locator('.admin-shell').count(), 0);
  pass('An Admin mutation 401 closes the gate');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
