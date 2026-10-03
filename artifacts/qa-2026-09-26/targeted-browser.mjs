import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright';
const output = path.resolve('artifacts/qa-2026-09-26');
const text = await fs.readFile('admin/src/services/api.ts', 'utf8');
const js = ts.transpileModule(text + '\nexport const fixture = { INITIAL_MACHINES, INITIAL_NEWS, INITIAL_MEDIA };', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { fixture } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const machines = fixture.INITIAL_MACHINES.map(m => ({ ...m, mainImage: fixture.INITIAL_MEDIA.find(i => i.id === m.mainImageId), standards: m.slug === 'optidist' ? [{ standard: { code: 'ASTM D86' } }] : [] }));
let news = fixture.INITIAL_NEWS.map(n => ({ ...n, thumbnailImage: fixture.INITIAL_MEDIA.find(i => i.id === n.thumbnailImageId), content: { version: 1, blocks: [...n.content.blocks, { type: 'paragraph', data: { text: 'QA paragraph two' } }, { type: 'paragraph', data: { text: 'QA paragraph three' } }] } }));
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let file = path.resolve(pathname.startsWith('/admin/') ? 'admin/dist' : 'dist', '.' + (pathname.startsWith('/admin/') ? pathname.slice(6) : pathname));
  try { if (!(await fs.stat(file)).isFile()) throw 0; } catch { if (path.extname(file)) { res.writeHead(404); res.end(); return; } file = path.resolve(pathname.startsWith('/admin/') ? 'admin/dist/index.html' : 'dist/index.html'); }
  try { const body = await fs.readFile(file); res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(4173, '127.0.0.1', r));
const browser = await chromium.launch(); const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
const page = await context.newPage(); page.setDefaultTimeout(5000); const results = []; const errors = [];
page.on('pageerror', e => errors.push(e.message));
const record = (name, passed, detail) => { const row = { name, passed, detail }; results.push(row); console.log(JSON.stringify(row)); };
await page.route('**/api/machines', r => r.fulfill({ json: machines }));
await page.route('**/api/news-events', r => r.fulfill({ json: news }));
const go = p => page.goto('http://127.0.0.1:4173' + p, { waitUntil: 'networkidle' });
try {
  await go('/gioi-thieu'); record('About with three paragraphs renders', await page.locator('h1').count() === 1, { errors: [...errors] });
  const event = news.find(n => n.slug === 'hoi-thao-van-an-toan'); event.content.blocks = [{ type: 'paragraph', data: { text: 'One valid paragraph' } }];
  await go('/gioi-thieu'); record('About tolerates shorter valid CMS article', await page.locator('h1').count() === 1, { errors: [...errors] }); await page.screenshot({ path: path.join(output, 'about-crash-one-paragraph.png') });
  await go('/pac'); await page.locator('input[type="search"]').fill('ASTM D86'); await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 1); record('Catalog searches linked technical standard', true, { text: await page.locator('.product-card').innerText() });
  await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).first().click(); await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 6);
  await page.locator('.catalog-category-strip').getByRole('button', { name: 'Áp suất hơi', exact: true }).click(); await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 1); record('Catalog category filter', (await page.locator('.product-card').innerText()).includes('HVP'), {});
  await go('/tin-tuc-su-kien'); for (const [label, count] of [['Tất cả', 2], ['Dự án', 2], ['Sự kiện', 1], ['Tin tức', 0]]) { await page.locator('.news-filter').getByRole('button', { name: label, exact: true }).click(); await page.waitForFunction(n => document.querySelectorAll('.news-card').length === n, count); record('News filter ' + label, true, { count }); }
  await page.locator('.news-filter').getByRole('button', { name: 'Tất cả', exact: true }).click(); await page.waitForFunction(() => document.querySelectorAll('.news-card').length === 2);
  news = []; await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.waitForTimeout(250); record('Empty news response removes stale content', await page.locator('.news-card').count() === 0, { count: await page.locator('.news-card').count() });
  await go('/san-pham/qa-does-not-exist'); record('Unknown product with populated catalog returns 404', (await page.locator('main').innerText()).includes('404'), {});
  await go('/lien-he'); await page.route('**/api/contacts', r => r.fulfill({ status: 201, json: { id: 'qa' } })); await page.locator('[name="name"]').fill('QA'); await page.locator('[name="contact"]').fill('qa@example.invalid'); await page.locator('[name="message"]').fill('QA'); await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); await page.locator('.form-status').waitFor(); record('Contact handles successful API response', true, {});
} catch(e) { record('Harness completed', false, { error: e.stack }); process.exitCode = 1; }
finally { await fs.writeFile(path.join(output, 'targeted-browser-results.json'), JSON.stringify(results, null, 2)); await browser.close(); server.close(); }
