import { NextRequest, NextResponse } from 'next/server';
import { getCmsContent, setCmsContent } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
    }

    const result = getCmsContent(slug);
    if (!result) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching CMS content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, content } = body;

    if (!slug || !content) {
      return NextResponse.json({ error: 'Missing slug or content' }, { status: 400 });
    }

    setCmsContent(slug, content);
    return NextResponse.json({ success: true, message: 'Content updated' });
  } catch (error) {
    console.error('Error updating CMS content:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}
