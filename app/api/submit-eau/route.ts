import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { validateAUDateRange, validateDateRange, validateEmail } from '@/app/lib/validation';
import { sendEmailToSB, sendConfirmationToEmployee } from '@/app/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_name,
      employee_vorname,
      employee_email,
      employee_id,
      doctor_date,
      from_date,
      to_date,
      is_first_submission,
    } = body;

    // Validate required fields (doctor_date is optional)
    if (!employee_name || !employee_vorname || !from_date || !to_date) {
      return NextResponse.json(
        { error: 'Erforderliche Felder fehlen' },
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

    // Validate dates: use AU validator if doctor_date provided, otherwise basic date range
    const validation = doctor_date
      ? validateAUDateRange(doctor_date, from_date, to_date)
      : validateDateRange(from_date, to_date);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Save submission
    const db = getDb();
    const senderIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const stmt = db.prepare(`
      INSERT INTO submissions (
        type, status, employee_name, employee_email, employee_id,
        sender_ip, user_agent, validation_result, data_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const submissionData: any = {
      type: 'eau',
      employee_name,
      employee_vorname,
      employee_email,
      employee_id,
      doctor_date: doctor_date || null,
      from_date,
      to_date,
      is_first_submission,
      days_count: validation.daysCount,
      sender_ip: senderIp,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    };

    const result = stmt.run(
      'eau',
      'accepted',
      employee_name,
      employee_email,
      employee_id,
      senderIp,
      userAgent,
      'success',
      JSON.stringify(submissionData)
    );

    const submissionId = result.lastInsertRowid;
    submissionData.id = submissionId;

    // Send emails
    await sendEmailToSB(submissionData);
    if (employee_email) {
      await sendConfirmationToEmployee(employee_email, submissionData);
    }

    return NextResponse.json(
      {
        success: true,
        submissionId,
        message: 'eAU-Information erfolgreich eingereicht',
        daysCount: validation.daysCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in eAU submission:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
