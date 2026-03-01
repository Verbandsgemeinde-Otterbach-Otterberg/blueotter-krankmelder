import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
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

  // Generate unique filename
  const timestamp = Date.now();
  const ext = path.extname(file.name);
  const baseName = path.basename(file.name, ext);
  const fileName = `${baseName}_${timestamp}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  // Save file
  const buffer = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));

  return {
    fileName,
    filePath,
    fileSize: file.size,
    mimeType: file.type,
  };
}

export function getUploadedFilePath(fileName: string): string {
  return path.join(UPLOAD_DIR, fileName);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
