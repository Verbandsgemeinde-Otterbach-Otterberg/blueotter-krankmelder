import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();

    // Get all au_scans to delete files
    const scans = db.prepare('SELECT file_path FROM au_scans').all() as any[];

    let filesDeleted = 0;
    for (const scan of scans) {
      try {
        if (scan.file_path && fs.existsSync(scan.file_path)) {
          fs.unlinkSync(scan.file_path);
          filesDeleted++;
        }
      } catch (err) {
        console.error('Error deleting file:', scan.file_path, err);
      }
    }

    // Delete all submissions and au_scans
    db.prepare('DELETE FROM au_scans').run();
    db.prepare('DELETE FROM submissions').run();

    return NextResponse.json({ 
      success: true, 
      message: `Gelöscht: Alle Meldungen und ${filesDeleted} Dateien`,
      deleted: {
        submissions: db.prepare('SELECT COUNT(*) as count FROM submissions').get() as any,
        auScans: db.prepare('SELECT COUNT(*) as count FROM au_scans').get() as any,
        files: filesDeleted
      }
    });
  } catch (error) {
    console.error('Error in delete-all route:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
