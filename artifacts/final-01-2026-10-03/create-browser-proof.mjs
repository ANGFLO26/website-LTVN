import fs from 'node:fs';
const original = fs.readFileSync('scripts/qa14c3-admin-bilingual-browser.mjs', 'utf8');
const prefix = original.slice(0, original.indexOf('\ntry {\n  // T1'))
  .replace('viewport: { width: 1280, height: 900 }', 'viewport: { width: 1280, height: 900 }, timezoneId: "UTC"');
const proof = `
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
`;
fs.writeFileSync('artifacts/final-01-2026-10-03/event-end-browser-proof.mjs', prefix + proof);
