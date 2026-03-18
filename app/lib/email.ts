import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import jsPDF from 'jspdf';
import { getDb, getSbEmailsForEmployer, getSubjectPrefixForEmployer, getGlobalSetting, getAllEmployerSettings } from '@/app/lib/db';
import { formatDateInTimeZone, formatDateTimeInTimeZone } from '@/app/lib/timezone';
import { getConfiguredTimeZone } from '@/app/lib/server-timezone';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
}

let transporter: nodemailer.Transporter | null = null;
let lastSmtpConfig: { host?: string; port?: number; user?: string; pass?: string } | null = null;

function getTransporter() {
  // Get current SMTP configuration from database, fallback to .env
  let smtpHost = getGlobalSetting('SMTP_HOST') || process.env.SMTP_HOST;
  let smtpPort = parseInt(getGlobalSetting('SMTP_PORT') || process.env.SMTP_PORT || '587');
  let smtpUser = getGlobalSetting('SMTP_USER') || process.env.SMTP_USER;
  let smtpPass = getGlobalSetting('SMTP_PASS') || process.env.SMTP_PASS;

  const currentConfig = {
    host: smtpHost,
    port: smtpPort,
    user: smtpUser,
    pass: smtpPass,
  };

  // Check if config has changed - if so, recreate transporter
  const configChanged =
    !lastSmtpConfig ||
    lastSmtpConfig.host !== currentConfig.host ||
    lastSmtpConfig.port !== currentConfig.port ||
    lastSmtpConfig.user !== currentConfig.user ||
    lastSmtpConfig.pass !== currentConfig.pass;

  if (!transporter || configChanged) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    lastSmtpConfig = currentConfig;
  }
  return transporter;
}

export async function sendEmailToSB(
  submissionData: any,
  auScanPath?: string
): Promise<boolean> {
  try {
    const transporter = getTransporter();
    
    // Get employer-specific settings (multiple addresses), fallback to global defaults
    const globalSbEmail = getGlobalSetting('SB_EMAIL') || process.env.SB_EMAIL;
    const employerSettings = getAllEmployerSettings().find(s => s.employer === submissionData.employer) || null;
    const employerEmails = employerSettings?.sb_emails && Array.isArray(employerSettings.sb_emails) ? employerSettings.sb_emails : getSbEmailsForEmployer(submissionData.employer);

    let recipients: string[] = Array.isArray(employerEmails) ? employerEmails.slice() : [];
    
    // Add global SB email if send_global_copy is enabled
    if (employerSettings?.send_global_copy && globalSbEmail && !recipients.includes(globalSbEmail)) {
      recipients.push(globalSbEmail);
    }
    
    if (recipients.length === 0 && globalSbEmail) {
      recipients = [globalSbEmail];
    }

    const employerSubjectPrefix = getSubjectPrefixForEmployer(submissionData.employer);
    const globalSubjectPrefix = getGlobalSetting('EMAIL_SUBJECT_PREFIX') || process.env.EMAIL_SUBJECT_PREFIX || 'Krankmeldung';
    const subjectPrefix = employerSubjectPrefix || globalSubjectPrefix;
    
    const senderEmail = getGlobalSetting('SMTP_FROM_EMAIL') || process.env.SMTP_FROM_EMAIL;

    if (!recipients.length || !senderEmail) {
      console.error('No recipients or SMTP_FROM_EMAIL not configured');
      return false;
    }

    // Enrich submissionData with validation info from DB if available
    if (submissionData && submissionData.id) {
      try {
        const db = getDb();
        const row = db.prepare('SELECT validation_result, error_message FROM submissions WHERE id = ?').get(submissionData.id) as any;
        if (row) {
          submissionData.validation_result = row.validation_result;
          submissionData.error_message = row.error_message;
        }
      } catch (err) {
        console.error('Error reading validation from DB for email:', err);
      }
    }

    const textContent = generateSBEmailText(submissionData);
    const attachments: EmailOptions['attachments'] = [
      {
        filename: `submission_${submissionData.id}_data.json`,
        content: Buffer.from(JSON.stringify(submissionData, null, 2)),
      },
    ];

    // Add AU scan file if present
    if (auScanPath && fs.existsSync(auScanPath)) {
      attachments.push({
        filename: path.basename(auScanPath),
        path: auScanPath,
      });
    }

    // Generate and attach PDF
    try {
      const pdfBuffer = await generateSubmissionPDF(submissionData);
      attachments.push({
        filename: `krankmeldung_${submissionData.id}.pdf`,
        content: pdfBuffer,
      });
    } catch (pdfError) {
      console.error('Error generating PDF for email:', pdfError);
    }

    const fullName = `${submissionData.employee_vorname || ''} ${submissionData.employee_name || ''}`.trim() || 'Unbekannt';
    const employerName = submissionData.employer || 'Unbekannt';
    const mailOptions: EmailOptions = {
      from: senderEmail,
      to: recipients.join(','),
      subject: `Krankmeldung: ${fullName} — ${employerName}`,
      text: textContent,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    // Log email send in audit_log
    try {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO audit_log (submission_id, action, details) VALUES (?, ?, ?)');
      stmt.run(submissionData?.id || null, 'email_sent_sb', JSON.stringify({ to: recipients, subject: mailOptions.subject }));
    } catch (err) {
      console.error('Failed to write email audit log (SB):', err);
    }

    return true;
  } catch (error) {
    console.error('Error sending email to SB:', error);
    try {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO audit_log (submission_id, action, details) VALUES (?, ?, ?)');
      stmt.run(submissionData?.id || null, 'email_failed_sb', JSON.stringify({ error: String(error) }));
    } catch (err) {
      console.error('Failed to write email audit log (SB failure):', err);
    }
    return false;
  }
}

export async function sendConfirmationToEmployee(
  employeeEmail: string,
  submissionData: any
): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const senderEmail = getGlobalSetting('SMTP_FROM_EMAIL') || process.env.SMTP_FROM_EMAIL;

    if (!senderEmail) {
      console.error('SMTP_FROM_EMAIL not configured');
      return false;
    }

    const textContent = generateEmployeeConfirmationText(submissionData);

    const mailOptions: EmailOptions = {
      from: senderEmail,
      to: employeeEmail,
      subject: `[${process.env.EMAIL_SUBJECT_PREFIX}] Bestätigung Ihrer Krankmeldung`,
      text: textContent,
    };

    await transporter.sendMail(mailOptions);
    // Log confirmation email
    try {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO audit_log (submission_id, action, details) VALUES (?, ?, ?)');
      stmt.run(submissionData?.id || null, 'email_sent_employee', JSON.stringify({ to: employeeEmail, subject: mailOptions.subject }));
    } catch (err) {
      console.error('Failed to write email audit log (employee):', err);
    }

    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    try {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO audit_log (submission_id, action, details) VALUES (?, ?, ?)');
      stmt.run(submissionData?.id || null, 'email_failed_employee', JSON.stringify({ to: employeeEmail, error: String(error) }));
    } catch (err) {
      console.error('Failed to write email audit log (employee failure):', err);
    }
    return false;
  }
}

export async function sendTestEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const senderEmail = getGlobalSetting('SMTP_FROM_EMAIL') || process.env.SMTP_FROM_EMAIL;
    if (!senderEmail) {
      console.error('SMTP_FROM_EMAIL not configured');
      return false;
    }

    const mailOptions: any = {
      from: senderEmail,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);

    try {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO audit_log (submission_id, action, details) VALUES (?, ?, ?)');
      stmt.run(null, 'email_test_sent', JSON.stringify({ to, subject }));
    } catch (err) {
      console.error('Failed to write email audit log (test):', err);
    }

    return true;
  } catch (error) {
    console.error('Error sending test email:', error);
    try {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO audit_log (submission_id, action, details) VALUES (?, ?, ?)');
      stmt.run(null, 'email_test_failed', JSON.stringify({ to, subject, error: String(error) }));
    } catch (err) {
      console.error('Failed to write email audit log (test failure):', err);
    }
    return false;
  }
}

async function generateSubmissionPDF(data: any): Promise<Buffer> {
  const db = getDb();
  const doc = new jsPDF();
  const timeZone = getConfiguredTimeZone();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.text('Krankmeldung - Meldungsübersicht', 20, yPosition);

  // Confidential note
  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(150, 0, 0);
  doc.text('Vertrauliche Personalsache', 20, yPosition);
  doc.setTextColor(0, 0, 0);

  yPosition += 12;

  // General Info
  doc.setFontSize(11);
  doc.setFont('', 'bold');
  doc.text('Allgemeine Angaben', 20, yPosition);

  yPosition += 8;
  doc.setFont('', 'normal');
  doc.setFontSize(10);

  const generalInfo = [
    [`Meldungs-ID:`, `${data.id}`],
    [`Meldungstyp:`, getMeldungsTyp(data.type)],
    [`Mitarbeiter:`, `${data.employee_name} ${data.employee_vorname || ''}`.trim()],
    [`E-Mail:`, `${data.employee_email || '-'}`],
    [`Arbeitgeber:`, `${data.employer || '-'}`],
    [`Eingereicht:`, formatDateTimeInTimeZone(new Date(), timeZone)],
  ];

  generalInfo.forEach(([label, value]) => {
    const text = `${label} ${value}`;
    const lines = doc.splitTextToSize(text, 160);
    doc.text(lines, 25, yPosition);
    yPosition += lines.length * 6;
  });

  yPosition += 5;

  // Submission specific info
  doc.setFont('', 'bold');
  doc.text('Krankmeldungsdetails', 20, yPosition);

  yPosition += 8;
  doc.setFont('', 'normal');

  const submissionInfo = getSubmissionInfo(data, timeZone);
  submissionInfo.forEach(([label, value]) => {
    const text = `${label} ${value}`;
    const lines = doc.splitTextToSize(text, 160);
    doc.text(lines, 25, yPosition);
    yPosition += lines.length * 6;
  });

  // Add AU scan image if available
  if (data.type === 'auscan' || data.type === 'childcare') {
    try {
      let auScan;
      if (data.id) {
        const auStmt = db.prepare('SELECT * FROM au_scans WHERE submission_id = ?');
        auScan = auStmt.get(data.id);
      }

      if (auScan && (auScan as any).file_path && fs.existsSync((auScan as any).file_path)) {
        yPosition += 10;

        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('', 'bold');
        doc.text('Eingereichte Datei', 20, yPosition);
        yPosition += 10;

        const fileBuffer = fs.readFileSync((auScan as any).file_path);
        const base64 = fileBuffer.toString('base64');
        const mimeType = (auScan as any).mime_type || 'application/pdf';

        if (mimeType.startsWith('image/')) {
          doc.addImage(`data:${mimeType};base64,${base64}`, 'JPEG', 20, yPosition, 170, 100);
        } else if (mimeType === 'application/pdf') {
          doc.text('[PDF-Datei: ' + (auScan as any).file_name + ']', 25, yPosition);
          yPosition += 6;
          doc.text('PDF-Dokumente können nicht direkt eingebettet werden.', 25, yPosition);
        }
      }
    } catch (error) {
      console.error('Error embedding scan:', error);
    }
  }

  // Generate PDF buffer
  const pdfBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfBuffer);
}

function getMeldungsTyp(type: string): string {
  const types: { [key: string]: string } = {
    simple: 'Einfache Krankmeldung',
    auscan: 'AU',
    eau: 'eAU-Information',
    childcare: 'Kindkrank-Meldung',
  };
  return types[type] || type;
}

function getSubmissionInfo(data: any, timeZone: string): [string, string][] {
  const info: [string, string][] = [];

  if (data.date) {
    const date = formatDateInTimeZone(data.date, timeZone);
    info.push(['Datum:', date]);
  } else if (data.from_date && data.to_date) {
    const fromDate = formatDateInTimeZone(data.from_date, timeZone);
    const toDate = formatDateInTimeZone(data.to_date, timeZone);
    info.push(['Zeitraum:', `${fromDate} bis ${toDate}`]);
  }

  if (data.days_count) {
    info.push(['Anzahl Tage:', `${data.days_count}`]);
  }

  if (data.doctor_date) {
    const docDate = formatDateInTimeZone(data.doctor_date, timeZone);
    info.push(['Feststellungsdatum (Arzt):', docDate]);
  }

  if (data.is_first_cert !== undefined) {
    info.push(['Bescheinigungstyp:', data.is_first_cert ? 'Erstbescheinigung' : 'Folgebescheinigung']);
  }

  if (data.child_name) {
    info.push(['Kind (Name):', data.child_name]);
  }

  if (data.child_dob) {
    const dob = formatDateInTimeZone(data.child_dob, timeZone);
    info.push(['Kind (Geburtsdatum):', dob]);
  }

  if (data.remarks) {
    info.push(['Bemerkung:', data.remarks]);
  }

  return info;
}

function generateSBEmailText(data: any): string {
  const timeZone = getConfiguredTimeZone();
  const typeLabel: { [key: string]: string } = {
    simple: 'Meldung ohne AU',
    auscan: 'AU',
    eau: 'eAU-Information',
    childcare: 'Meldung Kind krank',
  };
  const label = typeLabel[data.type] || data.type;

  // Helper function to format dates
  const formatDate = (dateStr: string) => {
    try {
      const asDate = new Date(dateStr);
      if (Number.isNaN(asDate.getTime())) return dateStr || '-';
      return asDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone,
      });
    } catch {
      return dateStr || '-';
    }
  };

  // Format the time period prominently
  let timePeriod = '';
  if (data.date) {
    timePeriod = formatDate(data.date);
  } else {
    timePeriod = `${formatDate(data.from_date)} bis ${formatDate(data.to_date)}`;
  }
  if (data.days_count) {
    timePeriod += ` (${data.days_count} Kalendertag(e))`;
  }

  let text = `VERBANDSGEMEINDE OTTERBACH-OTTERBERG
Krankmeldungssystem

================================================================================
NEUE KRANKMELDUNG - ${label.toUpperCase()}
================================================================================

NAME:           ${data.employee_name || '-'}
VORNAME:        ${data.employee_vorname || '-'}
ARBEITGEBER:    ${data.employer || '-'}
ZEITRAUM:       ${timePeriod}

================================================================================

Weitere Details:
- Eingangsdatum: ${formatDateTimeInTimeZone(new Date(), timeZone)}
- Status: ${data.validation_result === 'success' ? 'Akzeptiert' : data.validation_result === 'needs_review' ? 'Überprüfung erforderlich' : data.error_message ? 'Hinweis erforderlich' : 'In Bearbeitung'}`;

  if (data.error_message) {
    text += `\n- Hinweis: ${data.error_message}`;
  }
  if (data.validation_warning) {
    text += `\n- Validierungswarnung: ${data.validation_warning}`;
  }

  text += `

Zusätzliche Angaben:
- E-Mail: ${data.employee_email || '(nicht angegeben)'}`;

  if (data.remarks) {
    text += `\n- Bemerkung: ${data.remarks}`;
  }

  if (data.type === 'auscan') {
    text += `

Arbeitsunfähigkeitsbescheinigung:
- Feststellungsdatum: ${formatDate(data.doctor_date)}
- Art: ${data.is_first_cert ? 'Erstbescheinigung' : 'Folgebescheinigung'}
- Scan: ${data.au_scan ? 'Hochgeladen' : 'Nicht hochgeladen'}`;
  }

  if (data.type === 'childcare') {
    text += `

Angaben zum Kind:
- Name: ${data.child_name || '-'}
- Geburtsdatum: ${formatDate(data.child_dob)}
- Art der Bescheinigung: ${data.is_first_cert ? 'Erstbescheinigung' : 'Folgebescheinigung'}
- Ärztliche Bescheinigung: ${data.au_file ? 'Hochgeladen' : 'Nicht beigefügt'}`;
  }

  text += `

Technische Informationen:
- Submission-ID: #${data.id || '-'}

Diese E-Mail wurde automatisch vom Krankmeldungssystem generiert.
Die vollständigen Formulardaten finden Sie in der JSON-Anlage.
Das PDF-Dokument ist als Anhang beigefügt.

Verbandsgemeinde Otterbach-Otterberg
Team Personal · Durchwahlen: 06301 607-111, -112, -113
`;

  return text;
}

function generateEmployeeConfirmationText(data: any): string {
  const timeZone = getConfiguredTimeZone();
  const typeLabel: { [key: string]: string } = {
    simple: 'Meldung ohne AU',
    auscan: 'AU',
    eau: 'eAU-Information',
    childcare: 'Meldung Kind krank',
  };
  const label = typeLabel[data.type] || data.type;

  // Helper function to format dates
  const formatDate = (dateStr: string) => {
    try {
      const asDate = new Date(dateStr);
      if (Number.isNaN(asDate.getTime())) return dateStr || '-';
      return asDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone,
      });
    } catch {
      return dateStr || '-';
    }
  };

  let text = `VERBANDSGEMEINDE OTTERBACH-OTTERBERG
Krankmeldungssystem

BESTÄTIGUNG IHRER KRANKMELDUNG

Ihre Meldung wurde erfolgreich eingereicht.

Eingangsnummer: #${data.id || '?'}
Bitte bewahren Sie diese Nummer für Ihre Unterlagen auf.

Ihre Meldung:
- Meldungstyp: ${label}
- Eingangsdatum: ${formatDateTimeInTimeZone(new Date(), timeZone)}

Ihre Angaben:
- Name: ${data.employee_name || '-'}
- Vorname: ${data.employee_vorname || '-'}
- Arbeitgeber: ${data.employer || '-'}`;

  if (data.remarks) {
    text += `\n- Bemerkung: ${data.remarks}`;
  }

  text += `

Abwesenheitszeitraum:`;

  if (data.date) {
    text += `\n- Datum: ${formatDate(data.date)}`;
  } else {
    text += `\n- Von: ${formatDate(data.from_date)}`;
    text += `\n- Bis: ${formatDate(data.to_date)}`;
  }

  if (data.days_count) {
    text += `\n- Dauer: ${data.days_count} Kalendertag(e)`;
  }

  if (data.type === 'auscan') {
    text += `

Ihre Arbeitsunfähigkeitsbescheinigung:
- Art: ${data.is_first_cert ? 'Erstbescheinigung' : 'Folgebescheinigung'}
- Feststellungsdatum: ${formatDate(data.doctor_date)}
- Scan: ${data.au_scan ? 'Hochgeladen' : 'Nicht eingereicht'}`;
  }

  if (data.type === 'childcare') {
    text += `

Angaben zum Kind:
- Name: ${data.child_name || '-'}
- Geburtsdatum: ${formatDate(data.child_dob)}
- Art der Bescheinigung: ${data.is_first_cert ? 'Erstbescheinigung' : 'Folgebescheinigung'}
- Ärztliche Bescheinigung: ${data.au_file ? 'Hochgeladen' : 'Nicht beigefügt'}`;
  }

  if (data.error_message) {
    text += `

Wichtiger Hinweis:
${data.error_message}`;
  }

  text += `

Dies ist eine automatische Bestätigung des Erhalts Ihrer Meldung.
Bitte bewahren Sie diese E-Mail für Ihre Unterlagen auf.

Für Rückfragen oder Änderungen wenden Sie sich bitte direkt an die Personalstelle:

Verbandsgemeinde Otterbach-Otterberg
Team Personal
Durchwahlen: 06301 607-111, -112, -113
`;

  return text;
}
