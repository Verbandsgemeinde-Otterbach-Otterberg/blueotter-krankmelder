import { NextResponse } from 'next/server';

// Kept for old clients. Credentials must never be recovered or emailed.
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Der Passwortversand wurde deaktiviert. Bitte wenden Sie sich an die Administration.',
  }, { status: 410 });
}
