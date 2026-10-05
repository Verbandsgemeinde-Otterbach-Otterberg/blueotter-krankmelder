import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/app/lib/auth';
import { isSubmissionStatus } from '@/app/lib/status';
import { getDb } from '@/app/lib/db';
import fs from 'fs';

export async function DELETE(request: NextRequest, { params }: { params: any }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const idStr = (await params).id ?? '';
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const db = getDb();
    const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
    if (!submission) return NextResponse.json({ success: false, error: 'Meldung nicht gefunden' }, { status: 404 });

    // delete au_scans files
    const scans = db.prepare('SELECT * FROM au_scans WHERE submission_id = ?').all(id);
    for (const s of scans) {
      try {
        if ((s as any).file_path && fs.existsSync((s as any).file_path)) fs.unlinkSync((s as any).file_path);
      } catch (err) {
        console.error('Error deleting file', (s as any).file_path, err);
      }
    }

    // delete rows
    try {
      const delScans = db.prepare('DELETE FROM au_scans WHERE submission_id = ?');
      const delAudit = db.prepare('DELETE FROM audit_log WHERE submission_id = ?');
      const delSub = db.prepare('DELETE FROM submissions WHERE id = ?');

      // execute
      delScans.run(id);
      delAudit.run(id);
      delSub.run(id);

      // log deletion
      try {
        const stmt = db.prepare('INSERT INTO audit_log (submission_id, action, details) VALUES (?, ?, ?)');
        stmt.run(id, 'submission_deleted', JSON.stringify({ by: 'dashboard', ts: new Date().toISOString() }));
      } catch (err) {
        console.error('Failed to write deletion audit log:', err);
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error('Error during deletion transaction:', err);
      return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Löschen' }, { status: 500 });
  }
}

/** Update the processing status of a submission ('new' | 'processed'). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const id = parseInt((await params).id ?? '');
    if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const { status } = await request.json();
    if (!isSubmissionStatus(status)) {
      return NextResponse.json({ success: false, error: 'Ungültiger Status' }, { status: 400 });
    }

    const username = getSession(request)?.username ?? null;
    const db = getDb();
    const result = db
      .prepare(
        `UPDATE submissions
           SET status = ?,
               processed_at = CASE WHEN ? = 'processed' THEN CURRENT_TIMESTAMP ELSE NULL END,
               processed_by = CASE WHEN ? = 'processed' THEN ? ELSE NULL END,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(status, status, status, username, id);
    if (result.changes === 0) {
      return NextResponse.json({ success: false, error: 'Meldung nicht gefunden' }, { status: 404 });
    }

    db.prepare('INSERT INTO audit_log (submission_id, action, details) VALUES (?, ?, ?)').run(
      id,
      'status_changed',
      JSON.stringify({ status, by: username })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating submission status:', error);
    return NextResponse.json({ success: false, error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}
