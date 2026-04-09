import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { validateChildcareDateRange, validateEmail } from '@/app/lib/validation';
import { sendEmailToSB, sendConfirmationToEmployee } from '@/app/lib/email';
import { handleFileUpload, parseFormData } from '@/app/lib/file-upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await parseFormData(request);
    const noProofMessage = 'Sie haben Ihrer Meldung keinen Nachweis beigefügt. Bitte reichen Sie den Nachweis zeitnah bei der Personalverwaltung ein oder melden sich erneut über das Formular "Kind Krank" wenn Ihnen der Nachweis vorliegt.';

    const employee_name = formData.get('employee_name') as string;
    const employee_vorname = formData.get('employee_vorname') as string;
    const employer = formData.get('employer') as string;
    const employee_email = formData.get('employee_email') as string;
    const child_name = formData.get('child_name') as string;
    const child_dob = formData.get('child_dob') as string;
    const from_date = formData.get('from_date') as string;
    const to_date = formData.get('to_date') as string;
    const is_first_cert = formData.get('is_first_cert') === 'true';
    const au_file = formData.get('au_file') as File | null;
    const remarks = ((formData.get('remarks') as string) || '').trim();

    // Validate required fields
    // For Folgebescheinigung (is_first_cert=false), from_date is not required (will be derived from predecessor)
    if (!employee_name || !employee_vorname || !employer || !child_name || !child_dob || !to_date) {
      return NextResponse.json(
        { error: 'Erforderliche Felder fehlen' },
        { status: 400 }
      );
    }

    // For Erstbescheinigung, from_date is required
    if (is_first_cert && !from_date) {
      return NextResponse.json(
        { error: 'Startdatum ist erforderlich' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (employee_email && !validateEmail(employee_email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Validate dates
    let validation: any = { valid: true, daysCount: 0 };
    if (is_first_cert) {
      validation = validateChildcareDateRange(from_date, to_date);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    } else {
      // For Folgebescheinigung, derive from_date from predecessor
      const db = getDb();
      const stmt = db.prepare(`
        SELECT data_json FROM submissions 
        WHERE type = 'childcare' 
          AND JSON_EXTRACT(data_json, '$.employee_vorname') = ?
          AND JSON_EXTRACT(data_json, '$.employer') = ?
          AND JSON_EXTRACT(data_json, '$.is_first_cert') = 'true'
        ORDER BY JSON_EXTRACT(data_json, '$.to_date') DESC
        LIMIT 1
      `);
      const predecessor = stmt.get(employee_vorname, employer) as any;
      if (predecessor) {
        const predData = JSON.parse(predecessor.data_json);
        const predecessorToDate = new Date(predData.to_date);
        predecessorToDate.setDate(predecessorToDate.getDate() + 1);
        const derivedFromDate = predecessorToDate.toISOString().split('T')[0];
        // Override from_date
        (formData as any).set('from_date', derivedFromDate);
        validation = validateChildcareDateRange(derivedFromDate, to_date);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
      } else {
        // No predecessor, treat as first
        if (!from_date) {
          return NextResponse.json(
            { error: 'Startdatum ist erforderlich' },
            { status: 400 }
          );
        }
        validation = validateChildcareDateRange(from_date, to_date);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
      }
    }

    // Upload AU file if provided
    let uploadedFile: any = null;
    if (au_file) {
      try {
        uploadedFile = await handleFileUpload(au_file);
      } catch (uploadError: any) {
        return NextResponse.json(
          { error: uploadError.message },
          { status: 400 }
        );
      }
    }

    // Save submission
    const db = getDb();
    const senderIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const stmt = db.prepare(`
      INSERT INTO submissions (
        type, status, employee_name, employee_email,
        sender_ip, user_agent, validation_result, data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const submissionData: any = {
      type: 'childcare',
      employee_name,
      employee_vorname,
      employer,
      employee_email,
      child_name,
      child_dob,
      from_date,
      to_date,
      is_first_cert,
      remarks: remarks || null,
      days_count: validation.daysCount,
      sender_ip: senderIp,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    };

    if (uploadedFile) {
      submissionData.au_file = {
        filename: uploadedFile.fileName,
        original_filename: au_file!.name,
        file_size: uploadedFile.fileSize,
        mime_type: uploadedFile.mimeType,
      };
    } else {
      submissionData.validation_warning = noProofMessage;
    }

    const result = stmt.run(
      'childcare',
      'accepted',
      `${employee_name} ${employee_vorname}`,
      employee_email,
      senderIp,
      userAgent,
      uploadedFile ? 'success' : 'needs_review',
      JSON.stringify(submissionData)
    );

    const submissionId = result.lastInsertRowid;

    // Save AU file record if uploaded
    if (uploadedFile) {
      const auStmt = db.prepare(`
        INSERT INTO au_scans (submission_id, file_name, file_path, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?)
      `);

      auStmt.run(
        submissionId,
        uploadedFile.fileName,
        uploadedFile.filePath,
        uploadedFile.fileSize,
        uploadedFile.mimeType
      );
    }

    submissionData.id = submissionId;

    // Send emails
    await sendEmailToSB(submissionData, uploadedFile ? uploadedFile.filePath : undefined);
    if (employee_email) {
      await sendConfirmationToEmployee(employee_email, submissionData);
    }

    return NextResponse.json(
      {
        success: true,
        submissionId,
        message: 'Kindkrank-Meldung erfolgreich eingereicht',
        daysCount: validation.daysCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in childcare submission:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
