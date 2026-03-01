import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { validateAUDateRange, validateDateRange, validateEmail, validateFolgebescheinigungContinuity } from '@/app/lib/validation';
import { sendEmailToSB, sendConfirmationToEmployee } from '@/app/lib/email';
import { handleFileUpload, parseFormData } from '@/app/lib/file-upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await parseFormData(request);

    const employee_name = formData.get('employee_name') as string;
    const employee_vorname = formData.get('employee_vorname') as string;
    const employer = formData.get('employer') as string;
    const employee_email = formData.get('employee_email') as string;
    const doctor_date = formData.get('doctor_date') as string;
    const from_date = formData.get('from_date') as string;
    const to_date = formData.get('to_date') as string;
    const is_first_cert = formData.get('is_first_cert') === 'true';
    const file = formData.get('au_scan') as File | null; // Now optional

    // Validate required fields
    // For Folgebescheinigung (is_first_cert=false), from_date is not required (will be derived from predecessor)
    if (!employee_name || !employee_vorname || !employer || !to_date) {
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
      // If doctor_date provided, use AU validation; otherwise validate by from/to range
      if (doctor_date) {
        validation = validateAUDateRange(doctor_date, from_date, to_date);
      } else {
        validation = validateAUDateRange(from_date || '', from_date || '', to_date);
        // fallback: if validateAUDateRange expects doctor_date, try validateDateRange instead
        if (!validation.valid && from_date && to_date) {
          const vr = validateDateRange(from_date, to_date);
          validation = vr;
        }
      }
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    } else {
      // For Folgebescheinigung, just validate the to_date is valid
      try {
        const to = new Date(to_date);
        if (isNaN(to.getTime())) {
          return NextResponse.json(
            { error: 'Ungültiges Enddatum' },
            { status: 400 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { error: 'Ungültiges Enddatum' },
          { status: 400 }
        );
      }
    }

    // Validate Folgebescheinigung continuity if this is a follow-up cert
    let folgebescheinigungWarning: string | undefined;
    if (!is_first_cert) {
      const db = getDb();
      const folgeValidation = validateFolgebescheinigungContinuity(db, employee_vorname, employer, from_date || to_date);
      if (folgeValidation.warning) {
        folgebescheinigungWarning = folgeValidation.warning;
      }
    }

    // Upload file if provided
    let uploadedFile: any = null;
    if (file) {
      try {
        uploadedFile = await handleFileUpload(file);
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
      type: 'auscan',
      employee_name,
      employee_vorname,
      employer,
      employee_email,
      doctor_date,
      from_date: from_date || null, // null for Folgebescheinigung
      to_date,
      is_first_cert,
      days_count: validation.daysCount,
      sender_ip: senderIp,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    };

    if (folgebescheinigungWarning) {
      submissionData.validation_warning = folgebescheinigungWarning;
    }

    if (uploadedFile) {
      submissionData.au_scan = {
        filename: uploadedFile.fileName,
        original_filename: file!.name,
        file_size: uploadedFile.fileSize,
        mime_type: uploadedFile.mimeType,
      };
    }

    const result = stmt.run(
      'auscan',
      'accepted',
      `${employee_name} ${employee_vorname}`,
      employee_email,
      senderIp,
      userAgent,
      folgebescheinigungWarning ? 'needs_review' : 'success',
      JSON.stringify(submissionData)
    );

    const submissionId = result.lastInsertRowid;

    // Save AU scan record if file was uploaded
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
        message: 'AU-Meldung erfolgreich eingereicht',
        daysCount: validation.daysCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in AU scan submission:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
