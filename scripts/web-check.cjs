// End-to-end and accessibility checks for the public website (apps/web).
// Usage: build apps/web, serve apps/web/out on :3100, then `node scripts/web-check.cjs`.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.WEB_URL || 'http://localhost:3100';
const SHOTS = path.join(__dirname, '..', 'docs', 'screenshots', 'web');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); console.log('✓', name); }
  catch (e) { results.push({ name, ok: false, error: e.message }); console.log('✗', name, '-', e.message); }
};
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const go = (p) => page.goto(BASE + p, { waitUntil: 'networkidle' });
  const shot = (n, full = false) => page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 82, fullPage: full });

  await step('Home shows the independence notice and emergency numbers', async () => {
    await go('/?lang=en');
    expect(await page.getByText('Independent · Not official').isVisible(), 'notice missing');
    expect(await page.locator('a[href="tel:911"]').count() > 0, 'tel link missing');
    await shot('01-home', true);
  });
  await step('Language switch sets Arabic and right-to-left', async () => {
    await page.getByRole('button', { name: 'التبديل إلى العربية' }).click();
    expect((await page.getAttribute('html', 'dir')) === 'rtl', 'not rtl');
    expect(await page.getByText('مستقل · غير رسمي').isVisible(), 'arabic notice missing');
    await shot('02-home-ar');
    await page.getByRole('button', { name: 'Switch to English' }).click();
  });
  await step('Hazard guide switches to flash flood', async () => {
    await go('/prepare/');
    await page.getByRole('tab', { name: 'Flash flood' }).click();
    expect(await page.getByText('Never cross moving water').first().isVisible(), 'flood guidance missing');
    await shot('03-prepare');
  });
  await step('Family plan is saved on the device and survives reload', async () => {
    await go('/plan/');
    await page.fill('#f-household', 'Fictional family');
    await page.fill('#f-safeHome', 'Inner hallway');
    await page.locator('.check input').nth(0).check();
    await page.locator('.check input').nth(1).check();
    await page.reload({ waitUntil: 'networkidle' });
    expect((await page.inputValue('#f-household')) === 'Fictional family', 'plan not persisted');
    expect((await page.getByText('2 / 14 packed').count()) === 1, 'bag not persisted');
    await shot('04-plan', true);
  });
  await step('Fake-alert check flags a forwarded scam', async () => {
    await go('/check/');
    const qs = page.locator('fieldset');
    await qs.nth(0).locator('.opt').nth(2).click();
    await qs.nth(1).locator('.opt').nth(0).click();
    await qs.nth(2).locator('.opt').nth(0).click();
    await qs.nth(3).locator('.opt').nth(0).click();
    await qs.nth(4).locator('.opt').nth(1).click();
    expect(await page.getByText('This is likely fake or a scam').isVisible(), 'no scam verdict');
    await shot('05-check');
  });
  await step('Signature check accepts the original and rejects a tampered copy', async () => {
    await page.getByRole('button', { name: 'Verify signature' }).click();
    expect(await page.getByText('Signature valid.').isVisible(), 'original not valid');
    await page.getByRole('button', { name: 'Tamper with the message' }).click();
    await page.getByRole('button', { name: 'Verify signature' }).click();
    expect(await page.getByText('Signature invalid.').isVisible(), 'tamper not detected');
  });
  await step('Drill runs Yellow → Red → White and the phone ends on the all-clear', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go('/drill/');
    await page.getByRole('button', { name: 'Start the drill' }).click();
    await page.getByRole('button', { name: 'Send next message' }).click();
    await page.waitForTimeout(200);
    await shot('06-drill-red');
    await page.getByRole('button', { name: 'Send next message' }).click();
    await page.waitForTimeout(200);
    expect(await page.locator('.phone .alert-card.white').count() === 1, 'no white alert');
    expect(await page.locator('.phone .alert-card').count() === 3, 'expected three alerts');
  });
  await step('A tampered drill message is quarantined and never reaches the phone', async () => {
    await page.getByRole('radio', { name: 'Integrity failures' }).click();
    await page.getByRole('button', { name: 'Start the drill' }).click();
    await page.waitForTimeout(200);
    expect(await page.locator('.step.fail').count() === 1, 'no failed stage');
    expect(await page.locator('.phone .alert-card').count() === 0, 'tampered alert reached phone');
    await shot('07-drill-blocked');
  });
  await step('Mobile layout with menu', async () => {
    const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await m.goto(BASE + '/', { waitUntil: 'networkidle' });
    await m.getByRole('button', { name: 'Menu' }).click();
    expect(await m.getByRole('link', { name: 'Is it real?' }).isVisible(), 'menu not open');
    await m.screenshot({ path: path.join(SHOTS, '08-mobile-menu.jpg'), type: 'jpeg', quality: 82 });
    await m.close();
  });

  const a11y = [];
  await step('Accessibility: no serious or critical axe violations (EN and AR, all pages)', async () => {
    for (const lang of ['en', 'ar']) {
      for (const p of ['/', '/prepare/', '/plan/', '/check/', '/drill/', '/numbers/', '/about/']) {
        await go(p + '?lang=' + lang);
        await page.addScriptTag({ content: AXE });
        const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] })).violations);
        const bad = r.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        a11y.push({ page: p, lang, serious: bad.map((v) => ({ id: v.id, nodes: v.nodes.length, sample: v.nodes[0]?.target })) });
      }
    }
    const total = a11y.reduce((s, x) => s + x.serious.length, 0);
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'testing', 'web-a11y-report.json'), JSON.stringify(a11y, null, 2));
    expect(total === 0, `${total} serious issue types: ${JSON.stringify(a11y.filter((x) => x.serious.length))}`);
  });
  await step('No uncaught page errors', async () => expect(errors.length === 0, errors.join('; ')));

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
