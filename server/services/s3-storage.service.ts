/**
 * S3 Storage Service
 *
 * Handles file storage and retrieval from AWS S3
 * Features:
 * - Upload files with metadata
 * - Download files
 * - Delete files
 * - List files with prefix
 * - Generate signed URLs for temporary access
 * - Automatic cleanup of old files
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectAclCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TRPCError } from '@trpc/server';
import { serviceLoggers } from '../lib/logger';
import { withRetry, DEFAULT_RETRY_OPTIONS } from '../lib/retry';

const logger = serviceLoggers.deployment;

/**
 * S3 Storage Service
 */
class S3StorageService {
  private client: S3Client;
  private bucket = process.env.AWS_S3_BUCKET || 'webdev-projects';
  private region = process.env.AWS_REGION || 'us-east-1';

  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logger.warn('AWS credentials not configured for S3 storage');
    }

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    key: string,
    content: Buffer,
    contentType: string = 'application/octet-stream',
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      logger.info(`Uploading file to S3: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
      });

      await withRetry(
        () => this.client.send(command),
        DEFAULT_RETRY_OPTIONS
      );

      logger.info(`File uploaded successfully: ${key}`);

      return `s3://${this.bucket}/${key}`;
    } catch (error) {
      logger.error(`Failed to upload file: ${key}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Download a file from S3
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      logger.debug(`Downloading file from S3: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await withRetry(
        () => this.client.send(command),
        DEFAULT_RETRY_OPTIONS
      );

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body.getReader?.();

      if (reader) {
        let result = await reader.read();
        while (!result.done) {
          chunks.push(result.value);
          result = await reader.read();
        }
      } else {
        // Fallback for non-stream bodies
        const data = response.Body as any;
        if (typeof data === 'string') {
          chunks.push(Buffer.from(data));
        } else if (data instanceof Buffer) {
          chunks.push(data);
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error(`Failed to download file: ${key}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to download file',
      });
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      logger.info(`Deleting file from S3: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await withRetry(
        () => this.client.send(command),
        DEFAULT_RETRY_OPTIONS
      );

      logger.info(`File deleted successfully: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${key}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete file',
      });
    }
  }

  /**
   * List files with a given prefix
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      logger.debug(`Listing files with prefix: ${prefix}`);

      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await withRetry(
        () => this.client.send(command),
        DEFAULT_RETRY_OPTIONS
      );

      const files: string[] = [];

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) {
            files.push(obj.Key);
          }
        }
      }

      logger.debug(`Found ${files.length} files with prefix: ${prefix}`);

      return files;
    } catch (error) {
      logger.error(`Failed to list files with prefix: ${prefix}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list files',
      });
    }
  }

  /**
   * Generate a signed URL for temporary access to a file
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      logger.debug(`Generating signed URL for: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn,
      });

      logger.debug(`Signed URL generated for: ${key}`);

      return url;
    } catch (error) {
      logger.error(`Failed to generate signed URL for: ${key}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate signed URL',
      });
    }
  }

  /**
   * Copy a file within S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      logger.info(`Copying file from ${sourceKey} to ${destinationKey}`);

      // Download source and upload to destination
      const content = await this.downloadFile(sourceKey);
      await this.uploadFile(destinationKey, content);

      logger.info(`File copied successfully: ${sourceKey} -> ${destinationKey}`);
    } catch (error) {
      logger.error(
        `Failed to copy file from ${sourceKey} to ${destinationKey}`,
        error
      );

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to copy file',
      });
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<Record<string, string>> {
    try {
      logger.debug(`Getting metadata for file: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await withRetry(
        () => this.client.send(command),
        DEFAULT_RETRY_OPTIONS
      );

      return {
        contentType: response.ContentType || 'unknown',
        contentLength: response.ContentLength?.toString() || '0',
        lastModified: response.LastModified?.toISOString() || 'unknown',
        etag: response.ETag || 'unknown',
        ...response.Metadata,
      };
    } catch (error) {
      logger.error(`Failed to get metadata for file: ${key}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get file metadata',
      });
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(key);
      return !!metadata;
    } catch {
      return false;
    }
  }

  /**
   * Get bucket configuration
   */
  getBucketInfo(): {
    bucket: string;
    region: string;
  } {
    return {
      bucket: this.bucket,
      region: this.region,
    };
  }
}

export const s3StorageService = new S3StorageService();
