import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import { sendTestEmail } from '@/app/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.trim();

    console.log('Password request received for email:', email);

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-Adresse erforderlich' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get global SB_EMAIL from settings
    const globalSetting = db.prepare(
      "SELECT value FROM global_settings WHERE key = 'SB_EMAIL'"
    ).get() as { value: string } | undefined;

    const globalEmail = globalSetting?.value || process.env.SB_EMAIL || '';
    
    console.log('Global email from DB:', globalEmail);
    console.log('Match result:', email.toLowerCase() === globalEmail.toLowerCase());

    // Check if provided email matches global email
    if (email.toLowerCase() !== globalEmail.toLowerCase()) {
      // Log failed password request
      const details = JSON.stringify({
        to: email,
        globalEmail: globalEmail,
        error: 'E-Mail-Adresse stimmt nicht überein'
      });
      
      db.prepare(
        "INSERT INTO audit_log (action, details) VALUES (?, ?)"
      ).run('password_request_failed', details);

      console.log('Password request failed: Email mismatch');
      return NextResponse.json(
        { success: false, error: 'E-Mail-Adresse nicht korrekt' },
        { status: 401 }
      );
    }

    // Get admin password
    const passwordSetting = db.prepare(
      "SELECT value FROM global_settings WHERE key = 'ADMIN_PASSWORD'"
    ).get() as { value: string } | undefined;

    const adminPassword = passwordSetting?.value || '';

    if (!adminPassword) {
      console.error('Admin password not configured');
      return NextResponse.json(
        { success: false, error: 'Admin-Passwort nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Get app name for email
    const appNameSetting = db.prepare(
      "SELECT value FROM global_settings WHERE key = 'NEXT_PUBLIC_APP_NAME'"
    ).get() as { value: string } | undefined;

    const appName = appNameSetting?.value || process.env.NEXT_PUBLIC_APP_NAME || 'Krankmeldungssystem';
    // Get dashboard username
    const userSetting = db.prepare(
      "SELECT value FROM global_settings WHERE key = 'DASHBOARD_USER'"
    ).get() as { value: string } | undefined;

    const dashboardUser = userSetting?.value || process.env.DASHBOARD_USER || 'admin';

    // Send email with credentials
    const subject = `${appName} - Zugangsanforderung bestätigt`;
    const html = `
      <h1>${appName}</h1>
      <p>Hallo,</p>
      <p>Sie haben die Zugangsanforderung für das ${appName} gestellt.</p>
      <h3>Ihre Anmeldedaten:</h3>
      <p>
        <strong>Benutzername:</strong> ${dashboardUser}<br>
        <strong>Passwort:</strong> ${adminPassword}
      </p>
      <p>Bitte ändern Sie Ihr Passwort nach dem ersten Login.</p>
      <p>Mit freundlichen Grüßen,<br>Ihr Krankmeldungssystem</p>
    `;

    console.log('Attempting to send password email to:', globalEmail);
    const success = await sendTestEmail(globalEmail, subject, html);

    console.log('Email send result:', success);

    // Log password request result
    const details = JSON.stringify({
      to: globalEmail,
      subject: subject,
      success: success
    });

    const action = success ? 'password_request_sent' : 'password_request_failed';
    db.prepare(
      "INSERT INTO audit_log (action, details) VALUES (?, ?)"
    ).run(action, details);

    if (!success) {
      console.error('Failed to send password request email');
      return NextResponse.json(
        { success: false, error: 'Fehler beim E-Mail-Versand' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Zugangsdaten wurden an die globale Adresse versendet'
    });

  } catch (error) {
    console.error('Error in password request:', error);
    
    // Log unexpected error
    try {
      const db = getDb();
      const details = JSON.stringify({
        error: error instanceof Error ? error.message : String(error)
      });
      db.prepare(
        "INSERT INTO audit_log (action, details) VALUES (?, ?)"
      ).run('password_request_error', details);
    } catch (logError) {
      console.error('Failed to log password request error:', logError);
    }

    return NextResponse.json(
      { success: false, error: 'Serverfehler beim Versand' },
      { status: 500 }
    );
  }
}
