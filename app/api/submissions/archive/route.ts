import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const employers = body.employers as string[] | undefined;

    if (!employers || employers.length === 0) {
      return NextResponse.json({ success: false, error: 'Bitte mindestens einen Arbeitgeber angeben' }, { status: 400 });
    }

    const db = getDb();

    // Get all submissions and filter by employers
    let submissions = [];
    try {
      submissions = db.prepare('SELECT id, data_json FROM submissions').all() as any[];
    } catch (err) {
      console.error('Error fetching submissions:', err);
      return NextResponse.json({ success: false, error: `Fehler beim Abrufen von Meldungen: ${err}` }, { status: 500 });
    }

    const submissionsToDelete: any[] = [];
    for (const s of submissions) {
      try {
        const data = JSON.parse(s.data_json);
        if (employers.includes(data.employer)) {
          submissionsToDelete.push(s);
        }
      } catch (e) {
        console.error('Error parsing submission data:', e);
      }
    }

    if (submissionsToDelete.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const submissionIds = submissionsToDelete.map((s) => s.id);

    // Get au_scans for these submissions
    let scans = [];
    try {
      const placeholders = submissionIds.map(() => '?').join(',');
      scans = db.prepare(`SELECT file_path FROM au_scans WHERE submission_id IN (${placeholders})`).all(...submissionIds) as any[];
    } catch (err) {
      console.error('Error fetching au_scans:', err);
      return NextResponse.json({ success: false, error: `Fehler beim Abrufen von Scans: ${err}` }, { status: 500 });
    }

    // Delete files
    let filesDeleted = 0;
    for (const s of scans) {
      try {
        if (s.file_path) {
          const filePath = s.file_path;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            filesDeleted++;
          }
        }
      } catch (err) {
        console.error('Error deleting file', s.file_path, err);
      }
    }

    // Delete rows from database
    try {
      const placeholdersDelete = submissionIds.map(() => '?').join(',');
      
      // Must delete in order due to foreign keys:
      // 1. First delete audit_log entries
      // 2. Then delete au_scans entries
      // 3. Finally delete submissions
      
      const deleteAuditLog = db.prepare(
        `DELETE FROM audit_log WHERE submission_id IN (${placeholdersDelete})`
      );
      deleteAuditLog.run(...submissionIds);

      const deleteAuScans = db.prepare(
        `DELETE FROM au_scans WHERE submission_id IN (${placeholdersDelete})`
      );
      deleteAuScans.run(...submissionIds);

      const deleteSubmissions = db.prepare(
        `DELETE FROM submissions WHERE id IN (${placeholdersDelete})`
      );
      deleteSubmissions.run(...submissionIds);

      console.log(`Archived ${submissionIds.length} submissions, deleted ${filesDeleted} files`);
      return NextResponse.json({ success: true, deleted: submissionIds.length });
    } catch (err) {
      console.error('Error during deletion:', err);
      return NextResponse.json({ success: false, error: `Fehler beim Löschen: ${err}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in archive route:', error);
    return NextResponse.json({ success: false, error: `Fehler beim Archivieren: ${error}` }, { status: 500 });
  }
}
