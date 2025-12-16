/**
 * Advanced File Upload Service
 *
 * Handles file uploads with:
 * - Drag-and-drop support
 * - Upload progress tracking
 * - Multiple file handling
 * - Base64 and URL-based uploads
 * - File validation
 */

import { stagehandService } from '../stagehand.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ========================================
// TYPES
// ========================================

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  path?: string;
  base64?: string;
  url?: string;
  checksum?: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  status: 'pending' | 'preparing' | 'uploading' | 'verifying' | 'completed' | 'failed';
  progress: number; // 0-100
  bytesUploaded: number;
  totalBytes: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface UploadOptions {
  validateMimeType?: boolean;
  allowedMimeTypes?: string[];
  maxFileSize?: number; // in bytes
  verifyAfterUpload?: boolean;
  timeout?: number;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  uploadTime?: number;
  verificationPassed?: boolean;
  error?: string;
}

// ========================================
// CONSTANTS
// ========================================

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_TIMEOUT = 60000; // 60 seconds

const MIME_TYPE_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'video/mp4': ['.mp4'],
  'audio/mpeg': ['.mp3'],
  'application/zip': ['.zip'],
};

// ========================================
// FILE UPLOAD SERVICE
// ========================================

class FileUploadService {
  private uploadProgress: Map<string, UploadProgress> = new Map();
  private tempDir: string;

  constructor(tempDir: string = '/tmp/browser-uploads') {
    this.tempDir = tempDir;
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // ========================================
  // FILE PREPARATION
  // ========================================

  /**
   * Prepare a file for upload from various sources
   */
  async prepareFile(
    source: { filePath?: string; base64?: string; url?: string; name?: string },
    options: UploadOptions = {}
  ): Promise<{ success: boolean; fileInfo?: FileInfo; error?: string }> {
    try {
      let fileInfo: FileInfo;

      if (source.filePath) {
        fileInfo = await this.prepareFromPath(source.filePath);
      } else if (source.base64) {
        fileInfo = await this.prepareFromBase64(source.base64, source.name || 'uploaded-file');
      } else if (source.url) {
        fileInfo = await this.prepareFromUrl(source.url);
      } else {
        return { success: false, error: 'No file source provided' };
      }

      // Validate file
      const validationResult = this.validateFile(fileInfo, options);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      return { success: true, fileInfo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare file',
      };
    }
  }

  private async prepareFromPath(filePath: string): Promise<FileInfo> {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    return {
      id: this.generateFileId(),
      name: path.basename(filePath),
      size: stats.size,
      type: this.getMimeType(ext),
      path: filePath,
      checksum: this.calculateChecksum(content),
    };
  }

  private async prepareFromBase64(base64: string, name: string): Promise<FileInfo> {
    // Handle data URLs
    let data = base64;
    let mimeType = 'application/octet-stream';

    if (base64.startsWith('data:')) {
      const match = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        data = match[2];
      }
    }

    const buffer = Buffer.from(data, 'base64');
    const tempPath = path.join(this.tempDir, `${this.generateFileId()}-${name}`);
    fs.writeFileSync(tempPath, buffer);

    return {
      id: this.generateFileId(),
      name,
      size: buffer.length,
      type: mimeType,
      path: tempPath,
      base64: data,
      checksum: this.calculateChecksum(buffer),
    };
  }

  private async prepareFromUrl(url: string): Promise<FileInfo> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const fileName = this.extractFileNameFromUrl(url) || 'downloaded-file';
    const tempPath = path.join(this.tempDir, `${this.generateFileId()}-${fileName}`);

    fs.writeFileSync(tempPath, buffer);

    return {
      id: this.generateFileId(),
      name: fileName,
      size: buffer.length,
      type: contentType,
      path: tempPath,
      url,
      checksum: this.calculateChecksum(buffer),
    };
  }

  private validateFile(
    fileInfo: FileInfo,
    options: UploadOptions
  ): { valid: boolean; error?: string } {
    // Check file size
    const maxSize = options.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    if (fileInfo.size > maxSize) {
      return {
        valid: false,
        error: `File size ${fileInfo.size} exceeds maximum ${maxSize} bytes`,
      };
    }

    // Check MIME type
    if (options.validateMimeType && options.allowedMimeTypes) {
      if (!options.allowedMimeTypes.includes(fileInfo.type)) {
        return {
          valid: false,
          error: `File type ${fileInfo.type} not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  // ========================================
  // UPLOAD EXECUTION
  // ========================================

  /**
   * Upload a file to a file input element
   */
  async uploadToInput(
    sessionId: string,
    fileInfo: FileInfo,
    selector: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const startTime = Date.now();

    // Initialize progress tracking
    const progress: UploadProgress = {
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      status: 'preparing',
      progress: 0,
      bytesUploaded: 0,
      totalBytes: fileInfo.size,
      startTime,
    };
    this.uploadProgress.set(fileInfo.id, progress);

    try {
      // Update status
      this.updateProgress(fileInfo.id, { status: 'uploading', progress: 25 });

      // Ensure we have a file path
      if (!fileInfo.path) {
        throw new Error('File path is required for upload');
      }

      // Perform the upload
      const result = await stagehandService.uploadFile(sessionId, selector, fileInfo.path);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      this.updateProgress(fileInfo.id, { status: 'uploading', progress: 75 });

      // Verify upload if requested
      if (options.verifyAfterUpload) {
        this.updateProgress(fileInfo.id, { status: 'verifying', progress: 90 });
        const verified = await this.verifyUpload(sessionId, fileInfo.name);

        if (!verified) {
          throw new Error('Upload verification failed');
        }
      }

      const endTime = Date.now();
      this.updateProgress(fileInfo.id, {
        status: 'completed',
        progress: 100,
        bytesUploaded: fileInfo.size,
        endTime,
      });

      return {
        success: true,
        fileId: fileInfo.id,
        fileName: fileInfo.name,
        uploadTime: endTime - startTime,
        verificationPassed: options.verifyAfterUpload ? true : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      this.updateProgress(fileInfo.id, {
        status: 'failed',
        error: errorMessage,
        endTime: Date.now(),
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Simulate drag-and-drop file upload
   */
  async uploadViaDragDrop(
    sessionId: string,
    fileInfo: FileInfo,
    dropZoneSelector: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const startTime = Date.now();

    // Initialize progress tracking
    const progress: UploadProgress = {
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      status: 'preparing',
      progress: 0,
      bytesUploaded: 0,
      totalBytes: fileInfo.size,
      startTime,
    };
    this.uploadProgress.set(fileInfo.id, progress);

    try {
      // For drag-drop, we need to use a script-based approach
      // This is a simplified version; real implementation would involve
      // creating a DataTransfer object with the file

      this.updateProgress(fileInfo.id, { status: 'uploading', progress: 50 });

      // Use Stagehand to act on the drop zone
      // In practice, this might need custom JavaScript injection
      const result = await stagehandService.act(
        sessionId,
        `Upload file ${fileInfo.name} to the drop zone at ${dropZoneSelector}`
      );

      if (!result.success) {
        // Fall back to input upload
        console.log('[FileUpload] Drag-drop not supported, falling back to input upload');
        return this.uploadToInput(sessionId, fileInfo, `${dropZoneSelector} input[type="file"]`, options);
      }

      const endTime = Date.now();
      this.updateProgress(fileInfo.id, {
        status: 'completed',
        progress: 100,
        bytesUploaded: fileInfo.size,
        endTime,
      });

      return {
        success: true,
        fileId: fileInfo.id,
        fileName: fileInfo.name,
        uploadTime: endTime - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Drag-drop upload failed';
      this.updateProgress(fileInfo.id, {
        status: 'failed',
        error: errorMessage,
        endTime: Date.now(),
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    sessionId: string,
    files: FileInfo[],
    selector: string,
    options: UploadOptions = {}
  ): Promise<{
    success: boolean;
    results: UploadResult[];
    successCount: number;
    failedCount: number;
  }> {
    const results: UploadResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const file of files) {
      const result = await this.uploadToInput(sessionId, file, selector, options);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      results,
      successCount,
      failedCount,
    };
  }

  // ========================================
  // PROGRESS TRACKING
  // ========================================

  /**
   * Get upload progress
   */
  getProgress(fileId: string): UploadProgress | null {
    return this.uploadProgress.get(fileId) || null;
  }

  /**
   * Get all active uploads
   */
  getAllProgress(): UploadProgress[] {
    return Array.from(this.uploadProgress.values());
  }

  private updateProgress(fileId: string, update: Partial<UploadProgress>): void {
    const current = this.uploadProgress.get(fileId);
    if (current) {
      this.uploadProgress.set(fileId, { ...current, ...update });
    }
  }

  // ========================================
  // VERIFICATION
  // ========================================

  /**
   * Verify that a file was uploaded successfully
   */
  private async verifyUpload(sessionId: string, fileName: string): Promise<boolean> {
    try {
      // Look for the filename in the page content
      const result = await stagehandService.extract(
        sessionId,
        `Find evidence that the file "${fileName}" was uploaded successfully`,
        {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            evidence: { type: 'string' },
          },
        }
      );

      return Boolean(result.success && result.data && (result.data as any).found === true);
    } catch {
      return false;
    }
  }

  // ========================================
  // UTILITIES
  // ========================================

  private generateFileId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateChecksum(data: Buffer): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  private getMimeType(extension: string): string {
    for (const [mime, exts] of Object.entries(MIME_TYPE_EXTENSIONS)) {
      if (exts.includes(extension.toLowerCase())) {
        return mime;
      }
    }
    return 'application/octet-stream';
  }

  private extractFileNameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      return segments[segments.length - 1] || null;
    } catch {
      return null;
    }
  }

  /**
   * Clean up temporary files
   */
  cleanup(fileId?: string): void {
    if (fileId) {
      const progress = this.uploadProgress.get(fileId);
      if (progress) {
        this.uploadProgress.delete(fileId);
      }
    } else {
      // Clean up all completed/failed uploads
      for (const [id, progress] of Array.from(this.uploadProgress.entries())) {
        if (progress.status === 'completed' || progress.status === 'failed') {
          this.uploadProgress.delete(id);
        }
      }
    }

    // Clean temp directory
    try {
      const files = fs.readdirSync(this.tempDir);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < oneHourAgo) {
          fs.unlinkSync(filePath);
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();

// Export factory function for testing
export function createFileUploadService(tempDir?: string): FileUploadService {
  return new FileUploadService(tempDir);
}
