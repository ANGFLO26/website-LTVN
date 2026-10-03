import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import ts from 'typescript';

const root = path.resolve('.');
const output = path.join(root, 'artifacts/qa-2026-09-26');
await fs.mkdir(output, { recursive: true });
const fixtureSource = await fs.readFile(path.join(root, 'admin/src/services/api.ts'), 'utf8');
const fixtureJs = ts.transpileModule(fixtureSource + '\nexport const QA_FIXTURES = { INITIAL_MACHINES, INITIAL_MEDIA, INITIAL_STANDARDS, INITIAL_NEWS };', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { QA_FIXTURES: fixtures } = await import('data:text/javascript;base64,' + Buffer.from(fixtureJs).toString('base64'));
const baselineMachines = fixtures.INITIAL_MACHINES.map(m => ({ ...m, mainImage: fixtures.INITIAL_MEDIA.find(i => i.id === m.mainImageId), standards: m.standards?.map(s => ({ ...s, standard: fixtures.INITIAL_STANDARDS.find(st => st.id === s.standardId) })) }));
const baselineNews = fixtures.INITIAL_NEWS.map(n => ({ ...n, thumbnailImage: fixtures.INITIAL_MEDIA.find(i => i.id === n.thumbnailImageId) }));
const skipBaseline = process.env.QA_SKIP_BASELINE === '1';
const result = skipBaseline ? JSON.parse(await fs.readFile(path.join(output, 'browser-results.json'), 'utf8')) : { date: new Date().toISOString(), checks: [], routeChecks: [], errors: [] };
delete result.harnessError;
const record = (name, passed, detail) => { const row = { name, passed, detail }; const index = result.checks.findIndex(r => r.name === name); if (index >= 0) result.checks[index] = row; else result.checks.push(row); console.log(JSON.stringify(row)); };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
function server(directory) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api')) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"message":"isolated QA API unavailable"}'); return; }
    let file = path.resolve(directory, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(directory + path.sep) && file !== directory) { res.writeHead(403); res.end(); return; }
    try { if (!(await fs.stat(file)).isFile()) file = path.join(directory, 'index.html'); } catch { if (path.extname(file)) { res.writeHead(404); res.end(); return; } file = path.join(directory, 'index.html'); }
    try { const data = await fs.readFile(file); res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(data); } catch { res.writeHead(404); res.end(); }
  });
}
const publicServer = server(path.join(root, 'dist'));
const adminServer = server(path.join(root, 'admin/dist'));
await Promise.all([new Promise(r => publicServer.listen(4173, '127.0.0.1', r)), new Promise(r => adminServer.listen(4174, '127.0.0.1', r))]);
const browser = await chromium.launch({ headless: true });
const base = 'http://127.0.0.1:4173';
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
const page = await context.newPage();
page.setDefaultTimeout(7000);
page.on('pageerror', error => result.errors.push(error.message));
const go = async route => { await page.goto(base + route, { waitUntil: 'networkidle' }); };
const json = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
const fakeId = '99999999-9999-4999-8999-999999999999';
const machine = { id: fakeId, name: 'Thiết bị kiểm tra QA', slug: 'qa-machine', model: 'QA-900', status: 'published', sortOrder: 1, shortDescription: 'Mô tả thiết bị kiểm tra mới', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', mainImage: { publicUrl: '/images/products/optidist-2-official.png' }, specs: [], applications: [], highlights: [], standards: [] };
const article = { id: fakeId, title: 'Bản tin thử nghiệm mới', slug: 'qa-article', type: 'news', status: 'published', createdAt: '2026-09-01T00:00:00.000Z', publishedAt: '2026-09-01T00:00:00.000Z', content: { version: 1, blocks: [ { type: 'heading', data: { level: 2, text: 'QA HEADING REQUIRED' } }, { type: 'paragraph', data: { text: 'QA PARAGRAPH PRESENT' } }, { type: 'bullet_list', data: { items: ['QA LIST ITEM'] } }, { type: 'image', data: { url: '/images/products/optidist-2-official.png', alt: 'QA BODY IMAGE' } } ] } };
let machinesPayload = baselineMachines; let newsPayload = baselineNews;
await page.route('**/api/machines', route => json(route, machinesPayload));
await page.route('**/api/news-events', route => json(route, newsPayload));

try {
  const routes = ['/', '/gioi-thieu', '/pac', '/lien-he', '/tin-tuc-su-kien', ...baselineMachines.filter(p => p.status === 'published').map(p => '/san-pham/' + p.slug), ...baselineNews.filter(n => n.status === 'published').map(n => '/tin-tuc/' + n.slug), '/duong-dan-khong-ton-tai'];
  const allLinks = new Set();
  for (const language of skipBaseline ? [] : ['vi', 'en']) {
    await go('/'); await page.getByRole('button', { name: language === 'en' ? 'EN' : 'VI', exact: true }).click();
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await go(route);
        const state = await page.evaluate(async () => {
          const images = Array.from(document.images); images.forEach(i => { i.loading = 'eager'; });
          await Promise.all(images.map(i => i.decode().catch(() => undefined)));
          return { heading: document.querySelector('h1')?.textContent, lang: document.documentElement.lang, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, brokenImages: images.filter(i => !i.naturalWidth).map(i => i.getAttribute('src')), links: Array.from(document.querySelectorAll('a[href^="/"]'), a => a.getAttribute('href')) };
        });
        state.links.forEach(l => allLinks.add(l)); delete state.links;
        result.routeChecks.push({ route, language, width, ...state });
      }
    }
  }
  record('Baseline routes render at desktop/mobile in VI/EN', result.routeChecks.every(r => r.heading && r.lang === r.language && !r.overflow && r.brokenImages.length === 0), { count: result.routeChecks.length, failures: result.routeChecks.filter(r => !r.heading || r.lang !== r.language || r.overflow || r.brokenImages.length) });
  await page.setViewportSize({ width: 1440, height: 900 }); await go('/pac'); await page.getByRole('button', { name: 'VI', exact: true }).click();
  const defaultCount = await page.locator('.product-card').count();
  result.checks = result.checks.filter(r => r.name !== 'Catalog standard search');
  await page.locator('input[type="search"]').fill('  optidist  '); await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 1);
  record('Catalog model search case and whitespace', await page.locator('.product-card').count() === 1, { count: await page.locator('.product-card').count() });
  await page.locator('input[type="search"]').fill('qa-no-match-99999'); await page.waitForTimeout(120);
  record('Catalog empty search', await page.locator('.product-card').count() === 0, await page.locator('main').innerText());
  await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).first().click();
  await page.waitForFunction(n => document.querySelectorAll('.product-card').length === n, defaultCount);
  record('Catalog reset', await page.locator('.product-card').count() === defaultCount, { defaultCount });
  await go('/san-pham/optidist'); await page.getByRole('link', { name: 'Tư vấn sản phẩm này', exact: true }).click();
  record('Product contact preselection', await page.locator('select[name="product"]').inputValue() === 'optidist', page.url());
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  const opened = await page.locator('.main-nav').getAttribute('class'); await page.keyboard.press('Escape');
  record('Mobile menu opens and Escape closes it', opened.includes('is-open') && !(await page.locator('.main-nav').getAttribute('class')).includes('is-open'), {});
  await page.setViewportSize({ width: 1440, height: 900 });
  const brokenLinks = []; if (skipBaseline) allLinks.add('/baker-hughes');
  for (const route of allLinks) {
    const pathname = route.split(/[?#]/)[0];
    if (routes.includes(pathname)) continue;
    await go(route); if ((await page.locator('main').innerText()).includes('404')) brokenLinks.push(route);
  }
  record('Visible internal links resolve', brokenLinks.length === 0, brokenLinks);
  await go('/tin-tuc/hoi-thao-van-an-toan'); await page.getByRole('link', { name: 'Xem giải pháp van Baker Hughes', exact: true }).click();
  await page.screenshot({ path: path.join(output, 'broken-baker-link.png') });

  const contactRequests = [];
  let contactMode = '500';
  await page.route('**/api/contacts', async route => { contactRequests.push(route.request().postDataJSON()); if (contactMode === 'offline') return route.abort(); if (contactMode === 'slow') await new Promise(r => setTimeout(r, 1200)); return json(route, { message: 'QA controlled response' }, contactMode === '500' ? 500 : 201); });
  async function fillContact(contact = 'qa@example.invalid', name = 'QA audit', message = 'Synthetic request') { await page.locator('[name="name"]').fill(name); await page.locator('[name="contact"]').fill(contact); await page.locator('[name="message"]').fill(message); }
  for (const mode of ['500', 'offline']) {
    contactMode = mode; await go('/lien-he'); await fillContact(); await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); await page.locator('.form-status').waitFor();
    record('Contact rejects ' + mode, false, { displayed: await page.locator('.form-status').innerText() });
    if (mode === '500') await page.screenshot({ path: path.join(output, 'contact-false-success.png'), fullPage: true });
  }
  contactMode = 'success'; await go('/lien-he'); await fillContact('abc', '   ', '   '); const beforeInvalid = contactRequests.length;
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); await page.waitForTimeout(150);
  record('Contact validates whitespace and contact format', contactRequests.length === beforeInvalid, contactRequests.at(-1));
  contactMode = 'slow'; await go('/lien-he'); await fillContact(); const beforeDouble = contactRequests.length;
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).dblclick(); await page.waitForTimeout(1400);
  record('Contact prevents duplicate submission', contactRequests.length - beforeDouble === 1, { requests: contactRequests.length - beforeDouble });

  machinesPayload = [machine]; newsPayload = [article];
  await go('/pac');
  record('Published live machine replaces fallback', await page.locator('.product-card').count() === 1 && (await page.locator('.product-card').innerText()).includes('QA-900'), {});
  machinesPayload = []; newsPayload = []; await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(300);
  record('Empty response clears previous live catalog', await page.locator('.product-card').count() === 0, { count: await page.locator('.product-card').count(), text: await page.locator('.product-grid').innerText() });
  await go('/pac'); record('Initially empty database stays empty', await page.locator('.product-card').count() === 0, { count: await page.locator('.product-card').count() });
  machinesPayload = [{ ...machine, slug: 'optidist', status: 'draft' }]; newsPayload = [{ ...article, slug: 'ban-giao-pac-optidist-2', status: 'archived' }];
  await go('/pac'); record('Draft is hidden in catalog', await page.locator('.product-card').count() === 0, {});
  await go('/san-pham/optidist'); record('Draft product shows not found on direct URL', (await page.locator('main').innerText()).includes('404'), { text: await page.locator('main').innerText() });
  await page.screenshot({ path: path.join(output, 'product-stuck-loading.png') });
  await go('/tin-tuc/ban-giao-pac-optidist-2'); record('Archived article shows not found on direct URL', (await page.locator('main').innerText()).includes('404'), { text: await page.locator('main').innerText() });
  await go('/san-pham/does-not-exist'); record('Unknown product returns not found after empty published set', (await page.locator('main').innerText()).includes('404'), { text: await page.locator('main').innerText() });
  machinesPayload = [machine]; newsPayload = [article]; await go('/tin-tuc/qa-article');
  record('Article renders all authored blocks', (await page.locator('main').innerText()).includes('QA HEADING REQUIRED') && (await page.locator('main').innerText()).includes('QA LIST ITEM'), { body: await page.locator('.article-body').innerText(), inlineImageCount: await page.locator('.article-body img').count() });
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  record('New CMS content translates to English', !(await page.locator('h1').innerText()).includes('Bản tin'), { heading: await page.locator('h1').innerText(), lang: await page.locator('html').getAttribute('lang') });

  const admin = await context.newPage(); admin.setDefaultTimeout(7000);
  const mutations = []; let remoteMachines = [machine];
  await admin.route('**/api**', route => {
    const request = route.request(), pathname = new URL(request.url()).pathname;
    if (request.method() !== 'GET') { mutations.push({ method: request.method(), path: pathname, body: request.postDataJSON() }); return json(route, { message: 'QA simulated database error' }, 500); }
    return json(route, pathname === '/api' ? { ok: true } : pathname === '/api/machines' ? remoteMachines : []);
  });
  await admin.goto('http://127.0.0.1:4174', { waitUntil: 'networkidle' });
  record('Admin requires login', await admin.locator('input[type="password"]').count() > 0, { heading: await admin.locator('h1').first().innerText() });
  await admin.getByRole('button', { name: 'Máy Phân Tích PAC', exact: true }).click();
  await admin.getByTitle('Sửa máy', { exact: true }).click();
  const modal = admin.locator('.modal-dialog'); await modal.locator('input').first().fill('QA changed name');
  await modal.locator('.modal-footer button').last().click(); await admin.locator('.toast').waitFor();
  record('Admin reports failed save accurately', !(await admin.locator('.toast').innerText()).includes('thành công'), { toast: await admin.locator('.toast').innerText(), visibleOriginal: await admin.locator('.data-table').innerText(), methods: mutations.map(m => m.method) });
  await admin.screenshot({ path: path.join(output, 'admin-false-save-success.png') });
  record('Admin does not create after failed update', mutations.filter(m => m.method === 'POST').length === 0, mutations);
  await admin.getByRole('button', { name: 'Thêm Máy Mới', exact: true }).click();
  await modal.locator('input').first().fill('QA new machine'); await modal.locator('.modal-footer button').last().click(); await admin.waitForTimeout(400);
  await fs.writeFile(path.join(output, 'admin-mutation-payloads.json'), JSON.stringify(mutations, null, 2));
  record('New machine omits empty ID and database timestamps', !('createdAt' in mutations.at(-1).body) && mutations.at(-1).body.id !== '', mutations.at(-1));
  record('Admin public preview URL is deployment-aware', !(await admin.getByTitle('Xem trang sản phẩm trên website').first().getAttribute('href')).includes('localhost'), { href: await admin.getByTitle('Xem trang sản phẩm trên website').first().getAttribute('href') });
  await admin.setViewportSize({ width: 375, height: 812 });
  const mobileAdmin = await admin.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, mainWidth: document.querySelector('.admin-main').getBoundingClientRect().width }));
  record('Admin fits mobile viewport', mobileAdmin.scrollWidth <= 376, mobileAdmin);
  await admin.screenshot({ path: path.join(output, 'admin-mobile.png') });
  await admin.close();
} catch (error) { result.harnessError = String(error.stack || error); console.error(result.harnessError); process.exitCode = 1; }
finally { await fs.writeFile(path.join(output, 'browser-results.json'), JSON.stringify(result, null, 2)); await browser.close(); publicServer.close(); adminServer.close(); }
