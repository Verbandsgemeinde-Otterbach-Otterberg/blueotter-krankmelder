import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'krankmeldungen.db');

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();

  // Submissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      employee_name TEXT,
      employee_email TEXT,
      employee_id TEXT,
      submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      sender_ip TEXT,
      user_agent TEXT,
      validation_result TEXT,
      error_message TEXT,
      data_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // AU Scans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS au_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );
  `);

  // Audit log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );
  `);

  // Employer settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employer_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer TEXT UNIQUE NOT NULL,
      sb_email TEXT,
      sb_emails TEXT,
      send_global_copy INTEGER DEFAULT 0,
      requires_remarks INTEGER DEFAULT 0,
      subject_prefix TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Global settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS global_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Employers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      active BOOLEAN DEFAULT 1,
      color TEXT DEFAULT '#3B82F6',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Feedback table (anonymous ratings from success page)
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
      note TEXT,
      submission_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // CMS Content table (Markdown content for pages)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cms_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure `color` column exists for older DBs created before the column was added
  try {
    const cols = db.prepare("PRAGMA table_info('employers')").all() as any[];
    const hasColor = cols.some((c) => c && c.name === 'color');
    if (!hasColor) {
      db.exec("ALTER TABLE employers ADD COLUMN color TEXT DEFAULT '#3B82F6'");
    }
    const hasSort = cols.some((c) => c && c.name === 'sort_order');
    if (!hasSort) {
      db.exec('ALTER TABLE employers ADD COLUMN sort_order INTEGER DEFAULT 0');
      // initialize sort_order from id to keep a deterministic order for existing rows
      try {
        const rows = db.prepare('SELECT id FROM employers ORDER BY id').all() as any[];
        const update = db.prepare('UPDATE employers SET sort_order = ? WHERE id = ?');
        let idx = 1;
        for (const r of rows) {
          update.run(idx++, r.id);
        }
      } catch (e) {
        // ignore per-row migration errors
      }
    }
  } catch (e) {
    console.error('Error ensuring employers.color column exists:', e);
  }

  // Ensure employer_settings has sb_emails and send_global_copy columns for older DBs
  try {
    const esCols = db.prepare("PRAGMA table_info('employer_settings')").all() as any[];
    const hasSbEmails = esCols.some((c) => c && c.name === 'sb_emails');
    const hasSendGlobal = esCols.some((c) => c && c.name === 'send_global_copy');
    const hasGlobalEmail = esCols.some((c) => c && c.name === 'global_email');
    const hasRequiresRemarks = esCols.some((c) => c && c.name === 'requires_remarks');
    if (!hasSbEmails) {
      db.exec("ALTER TABLE employer_settings ADD COLUMN sb_emails TEXT DEFAULT '[]'");
      // If old sb_email exists, migrate to sb_emails as single-element JSON array
      const rows = db.prepare('SELECT employer, sb_email FROM employer_settings').all() as any[];
      const update = db.prepare('UPDATE employer_settings SET sb_emails = ? WHERE employer = ?');
      for (const r of rows) {
        try {
          const emails = r && r.sb_email ? JSON.stringify([r.sb_email]) : JSON.stringify([]);
          update.run(emails, r.employer);
        } catch (err) {
          // ignore individual migration errors
        }
      }
    }
    if (!hasSendGlobal) {
      db.exec('ALTER TABLE employer_settings ADD COLUMN send_global_copy INTEGER DEFAULT 0');
    }
    if (!hasGlobalEmail) {
      db.exec('ALTER TABLE employer_settings ADD COLUMN global_email TEXT');
    }
    if (!hasRequiresRemarks) {
      db.exec('ALTER TABLE employer_settings ADD COLUMN requires_remarks INTEGER DEFAULT 0');
    }
  } catch (e) {
    console.error('Error ensuring employer_settings columns exist:', e);
  }

  // Migrate employers from env if table is empty
  const employerCount = db.prepare('SELECT COUNT(*) as count FROM employers').get() as { count: number };
  if (employerCount.count === 0) {
    const employersEnv = process.env.EMPLOYERS;
    if (employersEnv) {
      try {
        const employers = JSON.parse(employersEnv);
        for (const employer of employers) {
          db.prepare('INSERT INTO employers (name, active) VALUES (?, 1)').run(employer);
        }
        console.log(`Migrated ${employers.length} employers from .env to database`);
      } catch (error) {
        console.error('Error migrating employers:', error);
      }
    }
  }
}

export default getDb;

export function getSbEmailForEmployer(employer: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT sb_email FROM employer_settings WHERE employer = ?').get(employer) as any;
  return row?.sb_email || null;
}

export function getSbEmailsForEmployer(employer: string): string[] {
  const db = getDb();
  const row = db.prepare('SELECT sb_emails, sb_email FROM employer_settings WHERE employer = ?').get(employer) as any;
  if (!row) return [];
  if (row.sb_emails) {
    try {
      const parsed = JSON.parse(row.sb_emails);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (e) {
      // fall back to legacy sb_email or comma-split
    }
  }
  if (row.sb_email) {
    return row.sb_email.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

export function getSubjectPrefixForEmployer(employer: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT subject_prefix FROM employer_settings WHERE employer = ?').get(employer) as any;
  return row?.subject_prefix || null;
}

export function setEmployerSettings(
  employer: string,
  sbEmails: string[] | string,
  subjectPrefix: string,
  sendGlobalCopy?: boolean,
  requiresRemarks?: boolean
) {
  const db = getDb();
  const emailsJson = typeof sbEmails === 'string' ? JSON.stringify(sbEmails ? sbEmails.split(',').map(s => s.trim()).filter(Boolean) : []) : JSON.stringify(sbEmails || []);
  db.prepare(`
    INSERT INTO employer_settings (employer, sb_emails, sb_email, subject_prefix, send_global_copy, requires_remarks, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(employer) DO UPDATE SET
      sb_emails = excluded.sb_emails,
      sb_email = excluded.sb_email,
      subject_prefix = excluded.subject_prefix,
      send_global_copy = excluded.send_global_copy,
      requires_remarks = excluded.requires_remarks,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    employer,
    emailsJson,
    (JSON.parse(emailsJson)[0] || null),
    subjectPrefix,
    sendGlobalCopy ? 1 : 0,
    requiresRemarks ? 1 : 0
  );
}

export function getAllEmployerSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT employer, sb_email, sb_emails, subject_prefix, send_global_copy, requires_remarks FROM employer_settings').all() as any[];
  return rows.map(r => ({
    employer: r.employer,
    sb_email: r.sb_email || null,
    sb_emails: r.sb_emails ? (JSON.parse(r.sb_emails) || []) : [],
    subject_prefix: r.subject_prefix || null,
    send_global_copy: r.send_global_copy ? true : false,
    requires_remarks: r.requires_remarks ? true : false
  }));
}

export function getGlobalSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM global_settings WHERE key = ?').get(key) as any;
  return row?.value || null;
}

export function getAllGlobalSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM global_settings').all() as any[];
  const result: Record<string, string> = {};
  rows.forEach(row => {
    result[row.key] = row.value;
  });
  return result;
}

export function setGlobalSetting(key: string, value: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO global_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(key, value);
}

export function setMultipleGlobalSettings(settings: Record<string, string>) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO global_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(key, value);
  }
}

export function getAllEmployers(): { id: number; name: string; active: boolean; color: string }[] {
  const db = getDb();
  return db.prepare('SELECT id, name, active, color FROM employers ORDER BY sort_order ASC, name').all() as { id: number; name: string; active: boolean; color: string }[];
}

export function addEmployer(name: string, color: string = '#3B82F6') {
  const db = getDb();
  // set sort_order to max(sort_order)+1 so new employers are appended
  const maxRow = db.prepare('SELECT MAX(sort_order) as max FROM employers').get() as any;
  const next = (maxRow && maxRow.max) ? Number(maxRow.max) + 1 : 1;
  db.prepare('INSERT INTO employers (name, active, color, sort_order) VALUES (?, 1, ?, ?)').run(name, color, next);
}

export function updateEmployer(id: number, name: string, active: boolean, color: string) {
  const db = getDb();
  db.prepare('UPDATE employers SET name = ?, active = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, active ? 1 : 0, color, id);
}

export function updateEmployerOrder(ids: number[]) {
  const db = getDb();
  const update = db.prepare('UPDATE employers SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  let idx = 1;
  const txn = db.transaction((rows: number[]) => {
    for (const id of rows) {
      update.run(idx++, id);
    }
  });
  txn(ids);
}

export function deleteEmployer(id: number) {
  const db = getDb();
  db.prepare('DELETE FROM employers WHERE id = ?').run(id);
}
export function insertFeedback(rating: number, note: string | null = null, submissionId: number | null = null) {
  const db = getDb();
  db.prepare('INSERT INTO feedback (rating, note, submission_id) VALUES (?, ?, ?)').run(rating, note, submissionId);
}

export function getFeedbackStats() {
  const db = getDb();
  const totalRow = db.prepare('SELECT COUNT(*) as count, AVG(rating) as avg FROM feedback').get() as any;
  const total = totalRow?.count || 0;
  const avg = totalRow?.avg ? Number(totalRow.avg) : 0;
  const distRows = db.prepare('SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating').all() as any[];
  const distribution: Record<string, number> = {};
  for (let i = 0; i <= 5; i++) distribution[i] = 0;
  distRows.forEach(r => {
    distribution[String(r.rating)] = r.count;
  });
  return { total, avg, distribution };
}

// CMS Content functions
export function getCmsContent(slug: string): { content: string; updated_at: string } | null {
  const db = getDb();
  const row = db.prepare('SELECT content, updated_at FROM cms_content WHERE slug = ?').get(slug) as any;
  if (!row) return null;
  return { content: row.content, updated_at: row.updated_at };
}

export function setCmsContent(slug: string, content: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO cms_content (slug, content, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET
      content = excluded.content,
      updated_at = CURRENT_TIMESTAMP
  `).run(slug, content);
}

export function initializeCmsContent(slug: string, defaultContent: string) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM cms_content WHERE slug = ?').get(slug) as any;
  if (!existing) {
    db.prepare('INSERT INTO cms_content (slug, content) VALUES (?, ?)').run(slug, defaultContent);
  }
}
