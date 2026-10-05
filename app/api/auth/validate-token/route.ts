import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSetting } from '@/app/lib/db';
import { clientIp, rateLimit, safeCompare } from '@/app/lib/auth';

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`token:${clientIp(req)}`, 20, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: 'Too many attempts' }, { status: 429 });
    }
    const body = await req.json();
    const { token } = body || {};
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token required' }, { status: 400 });
    }

    const expected = getGlobalSetting('PUBLIC_ACCESS_TOKEN') || process.env.PUBLIC_ACCESS_TOKEN || '';
    
    if (!expected) {
      return NextResponse.json({ success: false, error: 'No token configured' }, { status: 403 });
    }

    if (safeCompare(String(token), String(expected))) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  } catch (err) {
    console.error('Token validate error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
