/* eslint-disable no-console */
/**
 * Automated accessibility scan (axe-core, WCAG 2.0/2.1/2.2 A and AA rules) of the
 * dashboard and the civilian app (web build), in Arabic and English.
 * Prerequisites: same servers as scripts/demo-journey.cjs.
 * Exits non-zero if any serious or critical violation is found.
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const DASH = process.env.DASH_URL ?? 'http://localhost:3000';
const APP = process.env.APP_URL ?? 'http://localhost:8081';
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function scan(page, label) {
  await page.addScriptTag({ content: axeSource });
  const res = await page.evaluate(async () =>
    // eslint-disable-next-line no-undef
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }),
  );
  const v = res.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, samples: x.nodes.slice(0, 3).map((n) => (n.any[0]?.message ?? n.failureSummary ?? "").slice(0, 160)) }));
  const serious = v.filter((x) => x.impact === 'serious' || x.impact === 'critical');
  console.log(`${serious.length ? '✗' : '✓'} ${label}: ${res.passes.length} rules passed, ${v.length} violation types${v.length ? ' → ' + v.map((x) => `${x.id}(${x.impact}×${x.nodes})`).join(', ') : ''}`);
  return { label, violations: v, passes: res.passes.length };
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const dash = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await dash.goto(`${DASH}/`);
  await dash.getByText('Sign in as a demo staff member').waitFor();
  results.push(await scan(dash, 'dashboard: sign-in'));
  await dash.getByRole('button', { name: /^Omar/ }).click();
  await dash.waitForURL('**/overview');
  for (const p of ['overview', 'inbound', 'alerts', 'areas', 'delivery', 'simulator', 'health', 'audit', 'users']) {
    await dash.goto(`${DASH}/${p}`);
    await dash.waitForTimeout(1200);
    results.push(await scan(dash, `dashboard: ${p}`));
  }
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const lang of ['ar', 'en']) {
    await phone.goto(`${APP}/?lang=${lang}`);
    await phone.waitForTimeout(1500);
    results.push(await scan(phone, `app (${lang}): onboarding`));
    await phone.goto(`${APP}/?lang=${lang}&onboarded=1&demo=device&city=RIY-RIYADH`);
    await phone.waitForTimeout(1500);
    results.push(await scan(phone, `app (${lang}): home with active alert`));
    for (const tab of lang === 'ar' ? ['التنبيهات', 'الإرشادات', 'العائلة', 'المزيد'] : ['Alerts', 'Guidance', 'Family', 'More']) {
      await phone.getByRole('tab', { name: tab }).click();
      await phone.waitForTimeout(300);
      results.push(await scan(phone, `app (${lang}): ${tab}`));
    }
    await phone.getByRole('tab', { name: lang === 'ar' ? 'الرئيسية' : 'Home' }).click();
    await phone.getByRole('button', { name: lang === 'ar' ? 'فتح التنبيه' : 'Open alert' }).first().click();
    await phone.waitForTimeout(300);
    results.push(await scan(phone, `app (${lang}): alert detail`));
  }
  await browser.close();
  const out = path.resolve('docs/testing/a11y-report.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const bad = results.flatMap((r) => r.violations).filter((x) => x.impact === 'serious' || x.impact === 'critical');
  console.log(`\n${results.length} screens scanned. ${bad.length} serious/critical violation types. Report: ${path.relative(process.cwd(), out)}`);
  process.exit(bad.length ? 1 : 0);
})();
