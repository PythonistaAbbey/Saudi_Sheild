/* eslint-disable no-console */
/**
 * End-to-end demo journey and screenshot generator.
 *
 * Drives the operations dashboard and the civilian app through a full fictional
 * exercise: an issuer message is received, verified, prepared, approved by a
 * second person, published by a third, shown in the app, escalated, and cleared.
 * It also shows quarantine of a tampered message and the content checker
 * blocking unclear wording. Every step is asserted, so this doubles as the UI
 * journey test (Milestone 5).
 *
 * Prerequisites (see README "Run the demo"):
 *   API on :4000 (fresh start), dashboard on :3000, app web build on :8081.
 * Usage:
 *   node scripts/demo-journey.cjs [--out docs/screenshots] [--no-shots]
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const DASH = process.env.DASH_URL ?? 'http://localhost:3000';
const APP = process.env.APP_URL ?? 'http://localhost:8081';
const API = process.env.API_URL ?? 'http://localhost:4000';
const argOut = process.argv.indexOf('--out');
const OUT = path.resolve(argOut > 0 ? process.argv[argOut + 1] : 'docs/screenshots');
const SHOTS = !process.argv.includes('--no-shots');
fs.mkdirSync(OUT, { recursive: true });

let n = 0;
async function shot(page, name, opts = {}) {
  if (!SHOTS) return;
  n += 1;
  const file = path.join(OUT, `${String(n).padStart(2, '0')}-${name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 86, ...opts });
  console.log('  📸', path.relative(process.cwd(), file));
}

function step(msg) {
  console.log(`✓ ${msg}`);
}

async function login(page, name) {
  await page.goto(`${DASH}/`);
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await page.waitForURL('**/overview');
}

async function api(pathname, init = {}) {
  const res = await fetch(`${API}${pathname}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  return res.json();
}

async function main() {
  await api('/api/simulator/reset', { method: 'POST', body: '{}', headers: { authorization: `Bearer ${(await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ userId: 'u-ad-1' }) })).token}` } });
  const browser = await chromium.launch();
  const dash = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const phone = await phoneCtx.newPage();
  const phoneTall = await (await browser.newContext({ viewport: { width: 390, height: 1500 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();

  /* ------------------------------ app first run ----------------------------- */
  await phone.goto(`${APP}/?lang=ar`);
  await phone.getByText('درع السعودية').first().waitFor();
  await shot(phone, 'app-onboarding-ar');
  await phone.getByRole('button', { name: 'متابعة' }).click();
  await phone.getByRole('radio', { name: /English/ }).click();
  await shot(phone, 'app-onboarding-language');
  await phone.getByRole('button', { name: 'Continue' }).click();
  await phone.getByRole('button', { name: 'Riyadh', exact: true }).click();
  await phone.getByRole('button', { name: 'Continue' }).click();
  await phone.getByText('Official alerts come first').waitFor();
  await shot(phone, 'app-onboarding-authoritative');
  await phone.getByRole('button', { name: 'Start' }).click();
  await phone.getByText('No active alerts').first().waitFor();
  await shot(phone, 'app-home-calm-en');
  step('App onboarding: disclosure, language, on-device location, "official alerts come first"');

  /* --------------------------- dashboard sign-in ---------------------------- */
  await dash.goto(`${DASH}/`);
  await dash.getByText('Sign in as a demo staff member').waitFor();
  await shot(dash, 'dashboard-sign-in');
  await login(dash, 'Noura');
  await dash.getByText('Warning areas').first().waitFor();
  await dash.waitForTimeout(800);
  await shot(dash, 'dashboard-overview');
  step('Operator signs in; overview shows seeded fictional history');

  /* ------------------- issuer sends a signed Yellow alert ------------------- */
  await dash.goto(`${DASH}/simulator`);
  const drill = dash.locator('section', { hasText: 'Aerial threat drill' });
  await drill.getByRole('button', { name: 'Send' }).first().click();
  await drill.getByText('VERIFIED', { exact: true }).waitFor();
  await shot(dash, 'simulator-yellow-received');
  step('Simulated issuer message received and signature verified');

  await drill.getByRole('link', { name: 'Open workspace' }).first().click();
  await dash.getByRole('button', { name: 'Prepare for review' }).click();
  await dash.getByText('AI draft').first().waitFor();
  await dash.getByText('Waiting for a different person with the Approver role').waitFor();
  await dash.waitForTimeout(500);
  await shot(dash, 'workspace-prepared-ai-drafts', { fullPage: true });
  const alertUrl = dash.url();
  step('Operator prepares; AI drafts attached and labelled; operator cannot approve');

  /* ------------------------------- approval -------------------------------- */
  await login(dash, 'Huda');
  await dash.goto(alertUrl);
  await dash.getByRole('button', { name: 'Approve' }).click();
  await dash.getByText('Approved. Waiting for the duty publisher.').waitFor();
  step('Different approver approves (two-person rule)');

  /* ------------------------------- publication ------------------------------ */
  await login(dash, 'Sara');
  await dash.goto(alertUrl);
  await dash.getByRole('button', { name: 'Publish to public feed' }).click();
  await dash.getByRole('dialog').locator('input').fill('2468');
  await shot(dash, 'publish-confirmation');
  await dash.getByRole('dialog').getByRole('button', { name: 'Publish' }).click();
  await dash.getByText('published', { exact: true }).first().waitFor();
  await dash.waitForTimeout(600);
  await shot(dash, 'workspace-published', { fullPage: true });
  step('Duty publisher publishes after confirmation');

  /* --------------------------- app receives Yellow -------------------------- */
  await phone.getByText('Yellow alert: possible aerial threat risk').first().waitFor({ timeout: 20000 });
  await shot(phone, 'app-yellow-detail-en');
  await phone.getByRole('button', { name: /Back/ }).click();
  await shot(phone, 'app-home-yellow-en');
  step('App fetched the signed feed, verified it with the pinned key and opened the alert');

  /* ----------------------- issuer escalates to Red -------------------------- */
  await login(dash, 'Noura');
  await dash.goto(`${DASH}/simulator`);
  const drill2 = dash.locator('section', { hasText: 'Aerial threat drill' });
  // Fresh page has no run memory, so resume the run via API using the run id from the identifier.
  const alerts = await api('/api/alerts', { headers: { authorization: `Bearer ${(await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ userId: 'u-op-1' }) })).token}` } });
  const yellow = alerts.find((a) => a.identifier.endsWith('-1') && a.hazard === 'aerial_threat' && a.state === 'PUBLISHED');
  assert.ok(yellow, 'yellow alert published');
  const runId = yellow.identifier.split('-')[1];
  const opToken = (await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ userId: 'u-op-1' }) })).token;
  const auth = { authorization: `Bearer ${opToken}` };
  const red = await api('/api/simulator/run', { method: 'POST', headers: auth, body: JSON.stringify({ scenarioId: 'aerial-drill-riyadh', stepId: 'red', runId }) });
  for (let i = 0; i < 3; i++) await api(`/api/simulator/advance/${red.alert.id}`, { method: 'POST', headers: auth });
  assert.equal((await api(`/api/alerts/${red.alert.id}`, { headers: auth })).state, 'PUBLISHED');
  await drill2.waitFor();
  step('Issuer escalates to Red; autopilot runs prepare → approve → publish with distinct staff');

  await phone.getByText('Red alert: Aerial threat. Take protective action now').first().waitFor({ timeout: 20000 });
  await shot(phone, 'app-red-detail-en');
  await phoneTall.goto(`${APP}/?lang=en&onboarded=1&city=RIY-RIYADH`);
  await phoneTall.getByText('Red alert: Aerial threat').first().waitFor();
  await phoneTall.getByRole('button', { name: 'Open alert' }).click();
  await phoneTall.getByText('What to do now').waitFor();
  await shot(phoneTall, 'app-red-detail-full-en');
  await phoneTall.goto(`${APP}/?lang=ar&onboarded=1&city=RIY-RIYADH`);
  await phoneTall.getByText('إنذار أحمر: تهديد جوي').first().waitFor();
  await phoneTall.getByRole('button', { name: 'فتح التنبيه' }).click();
  await phoneTall.getByText('ماذا تفعل الآن').waitFor();
  await shot(phoneTall, 'app-red-detail-full-ar');
  await phoneTall.getByRole('button', { name: 'كلمات بسيطة' }).click();
  await shot(phoneTall, 'app-red-plain-language-ar');
  step('App shows Red with numbered steps, Arabic and plain-language versions');

  await phone.getByRole('button', { name: /Back/ }).click();
  await phone.getByText('Red alert: Aerial threat').first().waitFor();
  await shot(phone, 'app-home-red-en');

  await dash.goto(`${DASH}/overview`);
  await dash.waitForTimeout(1200);
  await shot(dash, 'dashboard-overview-red');

  /* ------------------------------ all clear -------------------------------- */
  const white = await api('/api/simulator/run', { method: 'POST', headers: auth, body: JSON.stringify({ scenarioId: 'aerial-drill-riyadh', stepId: 'white', runId }) });
  for (let i = 0; i < 3; i++) await api(`/api/simulator/advance/${white.alert.id}`, { method: 'POST', headers: auth });
  await phone.getByText('All clear: the aerial threat danger has ended').first().waitFor({ timeout: 20000 });
  await shot(phone, 'app-white-all-clear-en');
  await phone.getByRole('button', { name: /Back/ }).click();
  await phone.getByRole('tab', { name: 'Alerts' }).click();
  await phone.getByText('Verified alert history').waitFor();
  await shot(phone, 'app-history-en');
  step('Issuer declares White; app shows all clear and the verified history');

  /* --------------------------- integrity failures --------------------------- */
  for (const stepId of ['tampered', 'unknown']) await api('/api/simulator/run', { method: 'POST', headers: auth, body: JSON.stringify({ scenarioId: 'integrity-failures', stepId }) });
  await dash.goto(`${DASH}/inbound`);
  await dash.getByText('bad signature').first().waitFor();
  await dash.getByText('unknown key').first().waitFor();
  await shot(dash, 'inbound-quarantine', { fullPage: true });
  step('Tampered and unknown-key messages quarantined');

  /* ----------------------------- unclear wording ---------------------------- */
  const spec = await api('/api/simulator/run', { method: 'POST', headers: auth, body: JSON.stringify({ scenarioId: 'unclear-content', stepId: 'speculative' }) });
  await api(`/api/simulator/advance/${spec.alert.id}`, { method: 'POST', headers: auth });
  await login(dash, 'Huda');
  await dash.goto(`${DASH}/alerts/${spec.alert.id}`);
  await dash.getByText('SPECULATIVE_LANGUAGE').waitFor();
  assert.equal(await dash.getByRole('button', { name: 'Approve' }).isDisabled(), true);
  await shot(dash, 'workspace-blocked-speculative', { fullPage: true });
  step('Content checker blocks speculative wording; Approve disabled');

  /* ------------------------------ other pages ------------------------------- */
  await dash.goto(`${DASH}/areas`);
  await dash.getByText('All exercise zones').waitFor();
  await dash.locator('tr', { hasText: 'EX-RIY-A' }).click();
  await shot(dash, 'warning-areas');
  await dash.goto(`${DASH}/delivery`);
  await dash.getByText('Delivery rate').first().waitFor();
  await shot(dash, 'delivery');
  await dash.goto(`${DASH}/users`);
  await dash.getByText('Permission matrix').waitFor();
  await shot(dash, 'roles-matrix', { fullPage: true });
  await login(dash, 'Omar');
  await dash.goto(`${DASH}/audit`);
  await dash.getByText('Hash chain intact.').waitFor();
  await shot(dash, 'audit-log');
  await dash.goto(`${DASH}/health`);
  await dash.getByText('Trusted issuer keys').waitFor();
  await shot(dash, 'system-health');
  await dash.goto(`${DASH}/simulator`);
  await dash.getByText('Exercise simulator').first().waitFor();
  await shot(dash, 'simulator', { fullPage: true });
  step('Areas, delivery, roles, audit (auditor), health and simulator pages render');

  /* ------------------------------- app extras ------------------------------- */
  await phone.goto(`${APP}/?lang=ar&onboarded=1&city=RIY-RIYADH`);
  await phone.getByRole('tab', { name: 'الإرشادات' }).click();
  await shot(phone, 'app-guidance-ar');
  await phone.getByRole('button', { name: 'تهديد جوي' }).click();
  await shot(phone, 'app-guidance-aerial-ar');
  await phone.getByRole('tab', { name: 'العائلة' }).click();
  await phone.getByRole('button', { name: 'أنا بخير' }).click();
  await shot(phone, 'app-family-ar');
  await phone.getByRole('tab', { name: 'المزيد' }).click();
  await shot(phone, 'app-contacts-ar');
  await phone.goto(`${APP}/?lang=en&onboarded=1&city=RIY-RIYADH&hc=1&scale=1.3`);
  await phone.getByRole('tab', { name: 'More' }).click();
  await phone.getByText('Settings').first().scrollIntoViewIfNeeded();
  await shot(phone, 'app-settings-high-contrast-large-text');
  step('Guidance, family check-in, contacts and accessibility settings');

  /* ----------------------------- offline device ----------------------------- */
  await phone.goto(`${APP}/?lang=en&onboarded=1&city=RIY-RIYADH&offline=1`);
  await phone.getByText(/Offline\. Showing the last verified update/).first().waitFor();
  await shot(phone, 'app-offline-cached');
  step('Offline: app shows last verified state with its time and points to official channels');

  await phone.goto(`${APP}/?lang=en&onboarded=1&city=RIY-RIYADH&lite=1`);
  await phone.getByText(/Data saver/).first().waitFor();
  await phone.getByRole('tab', { name: 'Alerts' }).click();
  await phone.getByText('All clear: the aerial threat danger has ended').first().waitFor();
  await shot(phone, 'app-data-saver-history');
  step('Data saver: compact signed feed, text rendered on the device from the same approved templates');

  // A forged feed item (wrong signature) must never be displayed.
  await phone.route('**/api/public/feed', async (route) => {
    const res = await route.fetch();
    const feed = await res.json();
    feed.alerts.push({ ...feed.alerts[0], payload: { ...feed.alerts[0].payload, id: 'forged', level: 'red', publicState: 'active', texts: { ...feed.alerts[0].payload.texts, en: { headline: 'FORGED ALERT', body: '', steps: [] } } } });
    await route.fulfill({ response: res, json: feed });
  });
  await phone.goto(`${APP}/?lang=en&onboarded=1&city=RIY-RIYADH`);
  await phone.getByText(/failed verification and were hidden/).first().waitFor({ timeout: 15000 });
  assert.equal(await phone.getByText('FORGED ALERT').count(), 0);
  step('Forged feed item rejected by the app and never shown');

  await browser.close();
  console.log(`\nJourney passed.${SHOTS ? ` ${n} screenshots in ${path.relative(process.cwd(), OUT)}` : ''}`);
}

main().catch((e) => {
  console.error('\n✗ Journey failed:', e);
  process.exit(1);
});
