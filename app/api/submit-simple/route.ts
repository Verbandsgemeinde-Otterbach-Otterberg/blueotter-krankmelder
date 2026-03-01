import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { validateDateRange, validateEmail } from '@/app/lib/validation';
import { sendEmailToSB, sendConfirmationToEmployee } from '@/app/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_name,
      employee_vorname,
      employer,
      date,
      employee_email,
    } = body;

    // Validate required fields
    if (!employee_name || !employee_vorname || !employer || !date) {
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
      type: 'simple',
      employee_name,
      employee_vorname,
      employer,
      date,
      employee_email,
      sender_ip: senderIp,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    };

    const result = stmt.run(
      'simple',
      'accepted',
      `${employee_name} ${employee_vorname}`,
      employee_email,
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
        message: 'Krankmeldung erfolgreich eingereicht',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in simple submission:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
