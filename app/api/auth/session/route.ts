import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  return NextResponse.json({ authenticated: !!session, username: session?.username ?? null });
}
