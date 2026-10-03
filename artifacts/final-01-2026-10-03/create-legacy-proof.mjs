import fs from 'node:fs';
const original = fs.readFileSync('scripts/qa14c4-public-bilingual-browser.mjs', 'utf8');
const prefix = original.slice(0, original.indexOf('\nfunction pass(name)'));
const proof = `
try {
  await context.addInitScript(() => localStorage.setItem('ltv-language', 'vi'));
  mockNews = [{ id: 'legacy-location-audit', type: 'event', status: 'published', title: 'Legacy location audit',
    slug: 'legacy-location-audit', shortDescription: 'Legacy excerpt remains available', location: 'Địa điểm legacy cần giữ',
    content: { version: 1, blocks: [{ type: 'paragraph', data: { text: 'Legacy body remains available' } }] },
    createdAt: '2026-10-01T00:00:00Z' }];
  await page.goto(origin + '/tin-tuc/legacy-location-audit', { waitUntil: 'networkidle' });
  await page.locator('.article-header h1').waitFor();
  assert.equal(await page.locator('.article-header h1').innerText(), mockNews[0].title);
  assert.ok((await page.locator('.article-body').innerText()).includes('Legacy body remains available'));
  const locations = await page.locator('.article-location').count();
  assert.equal(locations, 0);
  assert.equal((await page.locator('body').innerText()).includes(mockNews[0].location), false);
  assert.deepEqual(pageErrors, []);
  await page.screenshot({ path: 'artifacts/final-01-2026-10-03/legacy-location-missing.png' });
  const finding = { id: 'FINAL-01-B3', severity: 'P2', environment: 'Production public build; Chromium; legacy response mock without translations; no DB',
    expected: 'Legacy VI article retains its authored top-level location', actual: 'Title/excerpt/body render in VI but location is discarded',
    sourceLocation: mockNews[0].location, domLocationCount: locations, pageErrors };
  await writeFile('artifacts/final-01-2026-10-03/legacy-location-proof.json', JSON.stringify(finding,null,2));
  console.log('CONFIRMED FINAL-01-B3: legacy VI top-level location is absent from the rendered article.');
} finally { await browser.close(); server.close(); }
`;
fs.writeFileSync('artifacts/final-01-2026-10-03/legacy-location-browser-proof.mjs', prefix + proof);
