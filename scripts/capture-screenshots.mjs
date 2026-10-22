/**
 * Captures README screenshots by driving the real UI headlessly.
 * Requires: mock (or real) Supabase on :54321 and `npm run dev` on :3000.
 * Usage: node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://127.0.0.1:3000';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
});

const shots = [];
async function newCtx() {
  return browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
}
async function shot(page, name, opts = {}) {
  await page.waitForTimeout(300);
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, ...opts });
  shots.push(`${name}.png`);
  console.log('captured', name);
}

async function login(email, password, orgName) {
  const context = await newCtx();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await Promise.all([
    page.waitForURL(/dashboard|select-org|onboarding/, { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(2500);
  if (orgName && page.url().includes('select-org')) {
    await shot(page, '08-select-org');
    await page.locator(`button:has-text("${orgName}")`).first().click();
    await page.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  return page;
}

// ---- Public / marketing ----
const pub = await ctx.newPage();
await pub.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await pub.waitForTimeout(600);
await shot(pub, '01-landing-hero');
// scroll to feature section
await pub.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.33));
await shot(pub, '02-landing-features', { fullPage: false });
await pub.evaluate(() => {
  const h = [...document.querySelectorAll('h2,h3')].find((e) => /pricing|plans/i.test(e.textContent));
  if (h) h.scrollIntoView();
});
await shot(pub, '03-landing-pricing');
await pub.close();

await pub; // noop

const auth = await ctx.newPage();
await auth.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await shot(auth, '04-login');
await auth.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });
await shot(auth, '05-signup');
await auth.goto(`${BASE}/forgot-password`, { waitUntil: 'networkidle' });
await shot(auth, '06-forgot-password');

// ---- Onboarding (user without org) ----
const fresh = await login('new@datacore.ai', 'Screenshots123!');
await fresh.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle' });
await fresh.waitForTimeout(800);
await shot(fresh, '07-onboarding', { fullPage: true });
await fresh.close();

// ---- Dashboard (owner, Pro org with data) ----
const page = await login('demo@datacore.ai', 'Screenshots123!', 'Acme Analytics');
await shot(page, '09-dashboard', { fullPage: true });

// Section close-ups: scroll the heading into view, capture the viewport.
async function sectionShot(name, headingText) {
  try {
    await page.getByText(headingText, { exact: false }).first().scrollIntoViewIfNeeded({ timeout: 8000 });
    await page.waitForTimeout(400);
    await shot(page, name);
  } catch (e) { console.warn('miss', name, String(e).split('\n')[0]); }
}
await sectionShot('10-kpi-cards', 'Total Revenue');
await sectionShot('11-sales-chart', 'Sales vs Target');
await sectionShot('12-inventory-table', 'Inventory Status');
await sectionShot('13-ai-insights', 'AI Insights Engine');
await sectionShot('14-nlq-chat', 'Natural Language Query');

// Org switcher dropdown open
try {
  const trigger = page.locator('button').filter({ hasText: 'Acme Analytics' }).first();
  await trigger.click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await shot(page, '15-org-switcher');
  await page.keyboard.press('Escape');
} catch (e) { console.warn('miss 15-org-switcher', String(e).split('\n')[0]); }

// ---- Feature pages ----
for (const [route, name] of [
  ['data', '16-data'],
  ['team', '17-team'],
  ['api-keys', '18-api-keys'],
  ['audit', '19-audit'],
  ['billing', '20-billing'],
  ['settings', '21-settings-alerts'],
]) {
  await page.goto(`${BASE}/${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot(page, name, { fullPage: true });
}

// ---- Free-plan org (gated dashboard) ----
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
try {
  await page.locator('button').filter({ hasText: 'Acme Analytics' }).first().click();
  await page.waitForTimeout(400);
  await page.locator('text=Northwind Retail').first().click();
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '22-dashboard-free-empty', { fullPage: true });
} catch (e) { console.warn('miss 21', String(e).split('\n')[0]); }

await browser.close();
console.log(`\n${shots.length} screenshots -> ${OUT}/`);
