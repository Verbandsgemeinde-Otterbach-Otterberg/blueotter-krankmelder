const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'https://krank.bachberg.de';
const PASSWORD = 'Otter2';
const SCREENSHOT_DIR = path.join(process.cwd(), 'manual-assets');

const submissionData = {
  employee_vorname: 'Max',
  employee_name: 'Mustermann',
  employer: 'Verbandsgemeinde FB1 - Zentrale Dienste',
  employee_email: 'max@troester.nl',
  from_date: '2026-02-24',
  to_date: '2026-02-26',
  is_first_cert: 'true',
};

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function run() {
  await ensureDir(SCREENSHOT_DIR);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login.png'), fullPage: true });

    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.getByText('Wählen Sie den Meldungstyp', { exact: false }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-typauswahl.png'), fullPage: true });

    await page.locator('div.cursor-pointer', { hasText: 'Krankmeldung mit AU' }).first().click();
    await page.getByRole('heading', { name: /Meldung mit AU/i }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-au-formular-leer.png'), fullPage: true });

    await page.locator('input[name="employee_vorname"]').fill(submissionData.employee_vorname);
    await page.locator('input[name="employee_name"]').fill(submissionData.employee_name);
    await page.locator('select[name="employer"]').selectOption({ label: submissionData.employer });
    await page.locator('input[name="employee_email"]').fill(submissionData.employee_email);
    await page.locator('input[name="from_date"]').fill(submissionData.from_date);
    await page.locator('input[name="to_date"]').fill(submissionData.to_date);
    await page.locator('select[name="is_first_cert"]').selectOption(submissionData.is_first_cert);

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-au-formular-ausgefuellt.png'), fullPage: true });

    await page.getByRole('button', { name: /AU einreichen/i }).click();

    await Promise.race([
      page.waitForURL(/\/success\?id=\d+/, { timeout: 30000 }),
      page.locator('.bg-red-100').first().waitFor({ timeout: 30000 }),
    ]);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-erfolg.png'), fullPage: true });

    const currentUrl = page.url();
    const url = new URL(currentUrl);
    const submissionId = url.searchParams.get('id');
    const errorText = await page.locator('.bg-red-100').first().textContent().catch(() => null);

    console.log(JSON.stringify({
      successUrl: currentUrl,
      submissionId,
      error: errorText ? errorText.trim() : null,
      screenshots: [
        'manual-assets/01-login.png',
        'manual-assets/02-typauswahl.png',
        'manual-assets/03-au-formular-leer.png',
        'manual-assets/04-au-formular-ausgefuellt.png',
        'manual-assets/05-erfolg.png',
      ],
      payload: submissionData,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Automation failed:', err);
  process.exit(1);
});
