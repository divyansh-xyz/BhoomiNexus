import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

export interface StoredFile {
  filename: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
}

export class StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = config.storagePath;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public async saveFile(fileBuffer: Buffer, originalFilename: string, mimeType: string): Promise<StoredFile> {
    const ext = path.extname(originalFilename) || this.getExtFromMime(mimeType);
    const filename = `${uuidv4()}${ext}`;
    const storagePath = path.join(this.uploadDir, filename);

    const maxSizeBytes = config.maxFileSizeMb * 1024 * 1024;
    if (fileBuffer.length > maxSizeBytes) {
      throw new Error(`File size exceeds maximum allowed size of ${config.maxFileSizeMb}MB`);
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/tiff',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(mimeType.toLowerCase()) && !ext.match(/\.(pdf|jpe?g|png|webp|tiff?|txt)$/i)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    await fs.promises.writeFile(storagePath, fileBuffer);

    return {
      filename,
      originalFilename,
      storagePath,
      mimeType,
      fileSize: fileBuffer.length,
    };
  }

  private getExtFromMime(mimeType: string): string {
    switch (mimeType.toLowerCase()) {
      case 'application/pdf':
        return '.pdf';
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '.bin';
    }
  }

  public getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  public async fileExists(storagePath: string): Promise<boolean> {
    try {
      await fs.promises.access(storagePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
