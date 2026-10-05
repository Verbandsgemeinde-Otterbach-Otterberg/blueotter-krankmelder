import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { validateFileType } from './validation';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png').split(',');

export interface UploadedFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export async function parseFormData(request: NextRequest): Promise<FormData> {
  return await request.formData();
}

export async function handleFileUpload(file: File): Promise<UploadedFile> {
  // Validate file type
  if (!validateFileType(file.name, ALLOWED_TYPES)) {
    throw new Error(`Dateityp nicht erlaubt. Erlaubte Typen: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `Datei zu groß. Maximale Größe: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`
    );
  }

  // Ensure upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Verify actual content (magic bytes) instead of trusting name/MIME from the client
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buffer);
  const allowed = detected && (ALLOWED_TYPES.includes(detected.ext) || (detected.ext === 'jpg' && ALLOWED_TYPES.includes('jpeg')));
  if (!detected || !allowed) {
    throw new Error(`Dateityp nicht erlaubt. Erlaubte Typen: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Server-generated filename: never reuse client-supplied names
  const fileName = `${crypto.randomUUID()}.${detected.ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, buffer, { mode: 0o600 });

  return {
    fileName,
    filePath,
    fileSize: file.size,
    mimeType: detected.mime,
  };
}

function detectFileType(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  return null;
}

export function getUploadedFilePath(fileName: string): string {
  return path.join(UPLOAD_DIR, fileName);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
