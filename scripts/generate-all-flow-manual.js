const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = 'https://krank.bachberg.de';
const PASSWORD = 'Otter2';
const OUT_DIR = path.join(process.cwd(), 'manual-assets');

const PERSON = {
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max@troester.nl',
  employer: 'Verbandsgemeinde FB1 - Zentrale Dienste',
};

const AU_DATES = {
  from: '2026-02-24',
  to: '2026-02-26',
};

const CHILDCARE = {
  childName: 'Emma Mustermann',
  childDob: '2018-05-14',
  from: '2026-02-24',
  to: '2026-02-26',
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeDummyPdf(targetPath) {
  const minimalPdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 20 100 Td (AU Testdokument) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000064 00000 n 
0000000121 00000 n 
0000000208 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
301
%%EOF
`;
  fs.writeFileSync(targetPath, minimalPdf, 'utf8');
}

async function clearOverlay(page) {
  await page.evaluate(() => {
    document.getElementById('__manual_overlay__')?.remove();
  });
}

async function shotWithMarks(page, fileName, markers) {
  const docMetrics = await page.evaluate(() => ({
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    width: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0,
      window.innerWidth
    ),
    height: Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
      window.innerHeight
    ),
  }));

  const boxes = [];
  for (const marker of markers) {
    const locator = marker.locator.first();
    const count = await locator.count();
    if (!count) continue;
    const box = await locator.boundingBox();
    if (!box) continue;

    boxes.push({
      x: box.x + docMetrics.scrollX,
      y: box.y + docMetrics.scrollY,
      w: box.width,
      h: box.height,
      label: marker.label,
      color: marker.color || '#ef4444',
    });
  }

  await page.evaluate(({ boxes, width, height }) => {
    document.getElementById('__manual_overlay__')?.remove();

    const layer = document.createElement('div');
    layer.id = '__manual_overlay__';
    layer.style.position = 'absolute';
    layer.style.left = '0';
    layer.style.top = '0';
    layer.style.width = `${width}px`;
    layer.style.height = `${height}px`;
    layer.style.zIndex = '2147483647';
    layer.style.pointerEvents = 'none';

    boxes.forEach((b) => {
      const rect = document.createElement('div');
      rect.style.position = 'absolute';
      rect.style.left = `${Math.max(0, b.x - 4)}px`;
      rect.style.top = `${Math.max(0, b.y - 4)}px`;
      rect.style.width = `${Math.max(20, b.w + 8)}px`;
      rect.style.height = `${Math.max(20, b.h + 8)}px`;
      rect.style.border = `4px solid ${b.color}`;
      rect.style.borderRadius = '10px';
      rect.style.boxShadow = '0 0 0 9999px rgba(2, 6, 23, 0.06) inset';

      const label = document.createElement('div');
      label.textContent = b.label;
      label.style.position = 'absolute';
      label.style.left = '0';
      label.style.top = '-34px';
      label.style.background = b.color;
      label.style.color = 'white';
      label.style.padding = '6px 10px';
      label.style.borderRadius = '8px';
      label.style.fontWeight = '700';
      label.style.fontSize = '14px';
      label.style.lineHeight = '1';
      label.style.whiteSpace = 'nowrap';
      label.style.fontFamily = 'Arial, sans-serif';

      rect.appendChild(label);
      layer.appendChild(rect);
    });

    document.body.appendChild(layer);
  }, { boxes, width: docMetrics.width, height: docMetrics.height });

  await page.waitForTimeout(220);
  await page.screenshot({
    path: path.join(OUT_DIR, fileName),
    fullPage: true,
  });
  await clearOverlay(page);
}

async function openHomeAndLogin(page, createLoginShot = false) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(600);

  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.count()) {
    if (createLoginShot) {
      await shotWithMarks(page, '00-login-marked.png', [
        { locator: passwordInput, label: '1) Passwort eingeben', color: '#2563eb' },
        { locator: page.getByRole('button', { name: /Anmelden/i }), label: '2) Anmelden klicken', color: '#16a34a' },
      ]);
    }
    await passwordInput.fill(PASSWORD);
    await page.getByRole('button', { name: /Anmelden/i }).click();
  }

  await page.getByText('Wählen Sie den Meldungstyp', { exact: false }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
}

async function takeSelectionShot(page) {
  await shotWithMarks(page, '01-typauswahl-marked.png', [
    { locator: page.locator('div.cursor-pointer', { hasText: 'Einfache Krankmeldung' }), label: 'A) Einfach', color: '#2563eb' },
    { locator: page.locator('div.cursor-pointer', { hasText: 'Krankmeldung mit AU' }), label: 'B) Mit AU', color: '#16a34a' },
    { locator: page.locator('div.cursor-pointer', { hasText: 'Kind krank melden' }), label: 'C) Kind krank', color: '#7c3aed' },
  ]);
}

async function runSimpleFlow(page) {
  await page.locator('div.cursor-pointer', { hasText: 'Einfache Krankmeldung' }).first().click();
  await page.getByRole('heading', { name: /Krankmeldung \(einfach\)/i }).waitFor({ timeout: 20000 });

  await page.locator('input[name="employee_vorname"]').fill(PERSON.firstName);
  await page.locator('input[name="employee_name"]').fill(PERSON.lastName);
  await page.locator('input[name="employee_email"]').fill(PERSON.email);
  await page.locator('select[name="employer"]').selectOption({ label: PERSON.employer });
  await page.waitForTimeout(300);

  await shotWithMarks(page, '10-simple-filled-marked.png', [
    { locator: page.locator('input[name="employee_vorname"]'), label: '1) Vorname', color: '#2563eb' },
    { locator: page.locator('input[name="employee_name"]'), label: '2) Nachname', color: '#16a34a' },
    { locator: page.locator('select[name="employer"]'), label: '3) Arbeitgeber', color: '#9333ea' },
    { locator: page.locator('input[name="employee_email"]'), label: '4) E-Mail (optional)', color: '#f59e0b' },
    { locator: page.getByRole('button', { name: /Krankmeldung absenden/i }), label: '5) Absenden', color: '#dc2626' },
  ]);

  await page.getByRole('button', { name: /Krankmeldung absenden/i }).click();
  await page.waitForURL(/\/success\?id=\d+/, { timeout: 30000 });
  await page.waitForTimeout(700);
  const id = new URL(page.url()).searchParams.get('id');

  await shotWithMarks(page, '11-simple-success-marked.png', [
    { locator: page.getByRole('heading', { name: /Meldung erfolgreich eingereicht/i }), label: 'Erfolg', color: '#16a34a' },
    { locator: page.getByRole('button', { name: /PDF Meldung herunterladen/i }), label: 'Optional: PDF laden', color: '#2563eb' },
    { locator: page.getByRole('link', { name: /Zur Startseite/i }), label: 'Weiter: Startseite', color: '#7c3aed' },
  ]);

  await page.getByRole('link', { name: /Zur Startseite/i }).click();
  await openHomeAndLogin(page, false);
  return id;
}

async function runAUFlow(page) {
  await page.locator('div.cursor-pointer', { hasText: 'Krankmeldung mit AU' }).first().click();
  await page.getByRole('heading', { name: /Meldung mit AU/i }).waitFor({ timeout: 20000 });

  await page.locator('input[name="employee_vorname"]').fill(PERSON.firstName);
  await page.locator('input[name="employee_name"]').fill(PERSON.lastName);
  await page.locator('select[name="employer"]').selectOption({ label: PERSON.employer });
  await page.locator('input[name="employee_email"]').fill(PERSON.email);
  await page.locator('input[name="from_date"]').fill(AU_DATES.from);
  await page.locator('input[name="to_date"]').fill(AU_DATES.to);
  await page.locator('select[name="is_first_cert"]').selectOption('true');
  await page.waitForTimeout(300);

  await shotWithMarks(page, '20-au-filled-marked.png', [
    { locator: page.locator('input[name="employee_vorname"]'), label: '1) Vorname', color: '#2563eb' },
    { locator: page.locator('input[name="employee_name"]'), label: '2) Nachname', color: '#16a34a' },
    { locator: page.locator('select[name="employer"]'), label: '3) Arbeitgeber', color: '#9333ea' },
    { locator: page.locator('input[name="from_date"]'), label: '4) Von', color: '#f59e0b' },
    { locator: page.locator('input[name="to_date"]'), label: '5) Bis', color: '#06b6d4' },
    { locator: page.locator('select[name="is_first_cert"]'), label: '6) Erst-/Folgebescheinigung', color: '#8b5cf6' },
    { locator: page.getByRole('button', { name: /AU einreichen/i }), label: '7) Absenden', color: '#dc2626' },
  ]);

  await page.getByRole('button', { name: /AU einreichen/i }).click();
  await page.waitForURL(/\/success\?id=\d+/, { timeout: 30000 });
  await page.waitForTimeout(700);
  const id = new URL(page.url()).searchParams.get('id');

  await shotWithMarks(page, '21-au-success-marked.png', [
    { locator: page.getByRole('heading', { name: /Meldung erfolgreich eingereicht/i }), label: 'Erfolg', color: '#16a34a' },
    { locator: page.getByRole('button', { name: /PDF Meldung herunterladen/i }), label: 'Optional: PDF laden', color: '#2563eb' },
    { locator: page.getByRole('link', { name: /Zur Startseite/i }), label: 'Weiter: Startseite', color: '#7c3aed' },
  ]);

  await page.getByRole('link', { name: /Zur Startseite/i }).click();
  await openHomeAndLogin(page, false);
  return id;
}

async function runChildcareFlow(page, pdfPath) {
  await page.locator('div.cursor-pointer', { hasText: 'Kind krank melden' }).first().click();
  await page.getByRole('heading', { name: /Kindkrank-Meldung/i }).waitFor({ timeout: 20000 });

  await page.locator('input[name="employee_vorname"]').fill(PERSON.firstName);
  await page.locator('input[name="employee_name"]').fill(PERSON.lastName);
  await page.locator('select[name="employer"]').selectOption({ label: PERSON.employer });
  await page.locator('input[name="employee_email"]').fill(PERSON.email);
  await page.locator('select[name="is_first_cert"]').selectOption('true');
  await page.locator('input[name="from_date"]').fill(CHILDCARE.from);
  await page.locator('input[name="to_date"]').fill(CHILDCARE.to);
  await page.locator('input[name="child_name"]').fill(CHILDCARE.childName);
  await page.locator('input[name="child_dob"]').fill(CHILDCARE.childDob);

  const uploadInput = page.locator('input[type="file"][accept*=".pdf"]').first();
  if (await uploadInput.count()) {
    await uploadInput.setInputFiles(pdfPath);
  }
  await page.waitForTimeout(400);

  await shotWithMarks(page, '30-childcare-filled-marked.png', [
    { locator: page.locator('input[name="employee_vorname"]'), label: '1) Vorname', color: '#2563eb' },
    { locator: page.locator('input[name="employee_name"]'), label: '2) Nachname', color: '#16a34a' },
    { locator: page.locator('select[name="employer"]'), label: '3) Arbeitgeber', color: '#9333ea' },
    { locator: page.locator('input[name="child_name"]'), label: '4) Name des Kindes', color: '#f59e0b' },
    { locator: page.locator('input[name="child_dob"]'), label: '5) Geburtsdatum Kind', color: '#06b6d4' },
    { locator: page.locator('input[name="from_date"]'), label: '6) Von', color: '#0ea5e9' },
    { locator: page.locator('input[name="to_date"]'), label: '7) Bis', color: '#8b5cf6' },
    { locator: page.getByRole('button', { name: /Kindkrank-Meldung einreichen/i }), label: '8) Absenden', color: '#dc2626' },
  ]);

  await page.getByRole('button', { name: /Kindkrank-Meldung einreichen/i }).click();
  await page.waitForURL(/\/success\?id=\d+/, { timeout: 30000 });
  await page.waitForTimeout(700);
  const id = new URL(page.url()).searchParams.get('id');

  await shotWithMarks(page, '31-childcare-success-marked.png', [
    { locator: page.getByRole('heading', { name: /Meldung erfolgreich eingereicht/i }), label: 'Erfolg', color: '#16a34a' },
    { locator: page.getByRole('button', { name: /PDF Meldung herunterladen/i }), label: 'Optional: PDF laden', color: '#2563eb' },
    { locator: page.getByRole('link', { name: /Zur Startseite/i }), label: 'Weiter: Startseite', color: '#7c3aed' },
  ]);

  await page.getByRole('link', { name: /Zur Startseite/i }).click();
  await openHomeAndLogin(page, false);
  return id;
}

async function run() {
  ensureDir(OUT_DIR);
  const dummyPdfPath = path.join(OUT_DIR, 'beispiel-au.pdf');
  writeDummyPdf(dummyPdfPath);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
  page.setDefaultTimeout(30000);

  try {
    await openHomeAndLogin(page, true);
    await takeSelectionShot(page);

    const simpleId = await runSimpleFlow(page);
    const auId = await runAUFlow(page);
    const childcareId = await runChildcareFlow(page, dummyPdfPath);

    const summary = {
      generatedAt: new Date().toISOString(),
      simpleSubmissionId: simpleId,
      auSubmissionId: auId,
      childcareSubmissionId: childcareId,
      assets: [
        'manual-assets/00-login-marked.png',
        'manual-assets/01-typauswahl-marked.png',
        'manual-assets/10-simple-filled-marked.png',
        'manual-assets/11-simple-success-marked.png',
        'manual-assets/20-au-filled-marked.png',
        'manual-assets/21-au-success-marked.png',
        'manual-assets/30-childcare-filled-marked.png',
        'manual-assets/31-childcare-success-marked.png',
      ],
    };

    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Failed to generate manual screenshots:', err);
  process.exit(1);
});
