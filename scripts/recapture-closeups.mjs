/**
 * Retakes the four dashboard close-ups as element screenshots.
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:3000';
const OUT = 'docs/screenshots';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const page = await context.newPage();
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('#email', 'demo@datacore.ai');
await page.fill('#password', 'Screenshots123!');
await Promise.all([page.waitForURL(/dashboard|select-org/, { timeout: 20000 }), page.click('button[type="submit"]')]);
await page.waitForTimeout(2500);
if (page.url().includes('select-org')) {
  await page.locator('button:has-text("Acme Analytics")').first().click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
}
await page.waitForSelector('h3:text-matches("Sales vs Target")', { timeout: 20000 });
await page.waitForTimeout(1000);

async function cardShot(name, title, selector = 'ancestor::div[contains(@class,"rounded-xl")][1]') {
  const el = page.locator(`h3:text-matches("^\\\\s*${title}\\\\s*$")`).first().locator(`xpath=${selector}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log('captured', name);
}

await cardShot('10-kpi-cards', 'Total Revenue', 'ancestor::div[contains(@class,"rounded-xl")][1]/ancestor::div[contains(@class,"grid")][1]');
await cardShot('11-sales-chart', 'Sales vs Target');
await cardShot('12-inventory-table', 'Inventory Status');
await cardShot('13-ai-insights', 'AI Insights Engine');

await browser.close();
