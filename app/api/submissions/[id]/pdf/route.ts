import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import jsPDF from 'jspdf';
import fs from 'fs';
import { formatDateInTimeZone, formatDateTimeInTimeZone } from '@/app/lib/timezone';
import { getConfiguredTimeZone } from '@/app/lib/server-timezone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submissionId = parseInt(id);

    const db = getDb();

    // Fetch submission
    const stmt = db.prepare('SELECT * FROM submissions WHERE id = ?');
    const submission: any = stmt.get(submissionId);

    if (!submission) {
      return NextResponse.json({ error: 'Meldung nicht gefunden' }, { status: 404 });
    }

    // Fetch AU scan if exists
    const auStmt = db.prepare('SELECT * FROM au_scans WHERE submission_id = ?');
    const auScan: any = auStmt.get(submissionId);

    // Parse submission data
    const data = JSON.parse(submission.data_json);

    // Create PDF
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
      [`Meldungs-ID:`, `${submission.id}`],
      [`Meldungstyp:`, getMeldungsTyp(data.type)],
      [`Status:`, submission.status],
      [`Mitarbeiter:`, `${data.employee_name}`],
      [`Mitarbeiter-ID:`, `${data.employee_id || '-'}`],
      [`E-Mail:`, `${data.employee_email || '-'}`],
      [`Eingereicht:`, formatDateTimeInTimeZone(submission.created_at, timeZone)],
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

    yPosition += 5;

    // Validation info
    doc.setFont('', 'bold');
    doc.text('Validierungsergebnis', 20, yPosition);

    yPosition += 8;
    doc.setFont('', 'normal');

    const valStatus = `Status: ${submission.validation_result || 'success'}`;
    let lines = doc.splitTextToSize(valStatus, 160);
    doc.text(lines, 25, yPosition);
    yPosition += lines.length * 6;

    if (submission.error_message) {
      const hint = `Hinweis: ${submission.error_message}`;
      lines = doc.splitTextToSize(hint, 160);
      doc.text(lines, 25, yPosition);
      yPosition += lines.length * 6;
    }

    // Add AU scan image if available
    if (auScan && fs.existsSync(auScan.file_path)) {
      yPosition += 10;

      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('', 'bold');
      doc.text('Eingereichte AU', 20, yPosition);
      yPosition += 10;

      try {
        // Read file and convert to base64
        const fileBuffer = fs.readFileSync(auScan.file_path);
        const base64 = fileBuffer.toString('base64');
        const mimeType = auScan.mime_type || 'application/pdf';

        if (mimeType.startsWith('image/')) {
          const imgData = `data:${mimeType};base64,${base64}`;
          doc.addImage(imgData, 'JPEG', 20, yPosition, 170, 100);
        } else if (mimeType === 'application/pdf') {
          doc.text('[PDF-Datei: ' + auScan.file_name + ']', 25, yPosition);
          yPosition += 6;
          doc.text('PDF-Dokumente können nicht direkt eingebettet werden.', 25, yPosition);
        }
      } catch (error) {
        console.error('Error embedding scan:', error);
        doc.text('[Fehler beim Einbetten der Datei]', 25, yPosition);
      }
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    // Return PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="submission_${submissionId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Fehler beim Generieren der PDF' },
      { status: 500 }
    );
  }
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

  // Arbeitgeber
  if (data.employer) {
    info.push(['Arbeitgeber:', data.employer]);
  }

  // For simple submissions
  if (data.type === 'simple' && data.date) {
    const date = formatDateInTimeZone(data.date, timeZone);
    info.push(['Meldungsdatum:', date]);
  }

  // For AU/eAU submissions with date range
  if (data.from_date && data.to_date) {
    const fromDate = formatDateInTimeZone(data.from_date, timeZone);
    const toDate = formatDateInTimeZone(data.to_date, timeZone);
    info.push(['Zeitraum:', `${fromDate} bis ${toDate}`]);
  }

  // Days count
  if (data.days_count) {
    info.push(['Anzahl Tage:', `${data.days_count}`]);
  }

  // Doctor date (for eAU)
  if (data.doctor_date) {
    const docDate = formatDateInTimeZone(data.doctor_date, timeZone);
    info.push(['Feststellungsdatum (Arzt):', docDate]);
  }

  // First submission indicator
  if (data.is_first_submission !== undefined) {
    info.push(['Meldungsart:', data.is_first_submission ? 'Erstmeldung' : 'Folgemeldung']);
  }

  if (data.is_first_cert !== undefined) {
    info.push(['Bescheinigung Art:', data.is_first_cert ? 'Erstbescheinigung' : 'Folgbescheinigung']);
  }

  // Child information
  if (data.child_name) {
    info.push(['Kind (Name):', data.child_name]);
  }

  if (data.child_dob) {
    const dob = formatDateInTimeZone(data.child_dob, timeZone);
    info.push(['Kind (Geburtsdatum):', dob]);
  }

  // Additional notes or fields
  if (data.notes) {
    info.push(['Notizen:', data.notes]);
  }

  if (data.remarks) {
    info.push(['Besonderheiten:', data.remarks]);
  }

  return info;
}
