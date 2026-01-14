/**
 * S3 Upload Service
 * Functions for uploading, downloading, and managing files in S3
 * Uses presigned URLs for secure browser-direct uploads
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3ServiceResponse } from './types';
import { toS3Error } from './types';
import { getS3Client } from './client';
import { decryptCredentials } from './crypto';
import type { S3Credentials } from '~/db/schema';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PresignedUploadUrlOptions {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
  metadata?: Record<string, string>;
}

export interface PresignedUploadUrlResult {
  uploadUrl: string;
  expiresAt: Date;
  bucket: string;
  key: string;
}

export interface PresignedDownloadUrlOptions {
  bucket: string;
  key: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
  filename?: string; // for Content-Disposition header
}

export interface PresignedDownloadUrlResult {
  downloadUrl: string;
  expiresAt: Date;
}

export interface S3UploadOptions {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface S3UploadResult {
  bucket: string;
  key: string;
  etag?: string;
  versionId?: string;
}

export interface S3ObjectInfo {
  exists: boolean;
  contentLength?: number;
  contentType?: string;
  lastModified?: Date;
  etag?: string;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get decrypted credentials and S3 client from credential profile
 */
function getClientFromProfile(credentialProfile: S3Credentials) {
  const decrypted = decryptCredentials({
    accessKeyId: credentialProfile.accessKeyId,
    secretAccessKey: credentialProfile.secretAccessKey,
    region: credentialProfile.region,
    sessionToken: credentialProfile.sessionToken || undefined,
    roleArn: credentialProfile.roleArn || undefined,
    roleExternalId: credentialProfile.roleExternalId || undefined,
    authMethod: credentialProfile.authMethod as 'access_key' | 'iam_role',
    credentialsExpireAt: credentialProfile.credentialsExpireAt || undefined,
  });

  return getS3Client(credentialProfile.id, decrypted);
}

// -----------------------------------------------------------------------------
// Presigned URL Functions
// -----------------------------------------------------------------------------

/**
 * Generate presigned URL for direct browser upload to S3
 * The browser can PUT directly to this URL without AWS credentials
 * @param credentialProfile - S3 credential profile from database
 * @param options - Upload URL options
 * @returns Presigned upload URL and expiration
 */
export async function generatePresignedUploadUrl(
  credentialProfile: S3Credentials,
  options: PresignedUploadUrlOptions
): Promise<S3ServiceResponse<PresignedUploadUrlResult>> {
  const startTime = Date.now();

  try {
    const client = getClientFromProfile(credentialProfile);
    const expiresIn = options.expiresIn || 3600; // Default 1 hour

    const command = new PutObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
      ContentType: options.contentType,
      Metadata: options.metadata,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      success: true,
      data: {
        uploadUrl,
        expiresAt,
        bucket: options.bucket,
        key: options.key,
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const s3Error = toS3Error(error);
    return {
      success: false,
      error: s3Error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Generate presigned URL for downloading/streaming from S3
 * @param credentialProfile - S3 credential profile from database
 * @param options - Download URL options
 * @returns Presigned download URL and expiration
 */
export async function generatePresignedDownloadUrl(
  credentialProfile: S3Credentials,
  options: PresignedDownloadUrlOptions
): Promise<S3ServiceResponse<PresignedDownloadUrlResult>> {
  const startTime = Date.now();

  try {
    const client = getClientFromProfile(credentialProfile);
    const expiresIn = options.expiresIn || 3600; // Default 1 hour

    const commandParams: {
      Bucket: string;
      Key: string;
      ResponseContentDisposition?: string;
    } = {
      Bucket: options.bucket,
      Key: options.key,
    };

    // Add Content-Disposition header if filename is provided
    if (options.filename) {
      commandParams.ResponseContentDisposition = `attachment; filename="${options.filename}"`;
    }

    const command = new GetObjectCommand(commandParams);
    const downloadUrl = await getSignedUrl(client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt,
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const s3Error = toS3Error(error);
    return {
      success: false,
      error: s3Error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

// -----------------------------------------------------------------------------
// Direct S3 Operations
// -----------------------------------------------------------------------------

/**
 * Upload file directly to S3 (for server-side uploads)
 * @param credentialProfile - S3 credential profile from database
 * @param options - Upload options
 * @returns Upload result with ETag
 */
export async function uploadToS3(
  credentialProfile: S3Credentials,
  options: S3UploadOptions
): Promise<S3ServiceResponse<S3UploadResult>> {
  const startTime = Date.now();

  try {
    const client = getClientFromProfile(credentialProfile);

    const command = new PutObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      Metadata: options.metadata,
    });

    const response = await client.send(command);

    return {
      success: true,
      data: {
        bucket: options.bucket,
        key: options.key,
        etag: response.ETag?.replace(/"/g, ''),
        versionId: response.VersionId,
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const s3Error = toS3Error(error);
    return {
      success: false,
      error: s3Error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Delete object from S3
 * @param credentialProfile - S3 credential profile from database
 * @param bucket - S3 bucket name
 * @param key - S3 object key
 * @returns Success status
 */
export async function deleteFromS3(
  credentialProfile: S3Credentials,
  bucket: string,
  key: string
): Promise<S3ServiceResponse<boolean>> {
  const startTime = Date.now();

  try {
    const client = getClientFromProfile(credentialProfile);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);

    return {
      success: true,
      data: true,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const s3Error = toS3Error(error);
    return {
      success: false,
      error: s3Error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Check if object exists in S3 and get metadata
 * @param credentialProfile - S3 credential profile from database
 * @param bucket - S3 bucket name
 * @param key - S3 object key
 * @returns Object info including existence and metadata
 */
export async function getObjectInfo(
  credentialProfile: S3Credentials,
  bucket: string,
  key: string
): Promise<S3ServiceResponse<S3ObjectInfo>> {
  const startTime = Date.now();

  try {
    const client = getClientFromProfile(credentialProfile);

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    return {
      success: true,
      data: {
        exists: true,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag?.replace(/"/g, ''),
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    // Check if it's a "not found" error
    const errorMessage = error instanceof Error ? error.message : '';
    if (
      errorMessage.toLowerCase().includes('notfound') ||
      errorMessage.toLowerCase().includes('not found') ||
      (error as { name?: string })?.name === 'NotFound'
    ) {
      return {
        success: true,
        data: { exists: false },
        processingTime: Date.now() - startTime,
      };
    }

    const s3Error = toS3Error(error);
    return {
      success: false,
      error: s3Error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Check if object exists in S3 (simple boolean check)
 * @param credentialProfile - S3 credential profile from database
 * @param bucket - S3 bucket name
 * @param key - S3 object key
 * @returns True if object exists
 */
export async function objectExists(
  credentialProfile: S3Credentials,
  bucket: string,
  key: string
): Promise<S3ServiceResponse<boolean>> {
  const result = await getObjectInfo(credentialProfile, bucket, key);

  if (!result.success) {
    return result as S3ServiceResponse<boolean>;
  }

  return {
    success: true,
    data: result.data?.exists || false,
    processingTime: result.processingTime,
  };
}

// -----------------------------------------------------------------------------
// Download Functions
// -----------------------------------------------------------------------------

export interface DownloadToFileOptions {
  bucket: string;
  key: string;
  localPath: string;
}

export interface DownloadToFileResult {
  localPath: string;
  contentLength: number;
  contentType?: string;
}

/**
 * Download file from S3 to local filesystem
 * Used for downloading recordings before transcription
 * @param credentialProfile - S3 credential profile from database
 * @param options - Download options including local path
 * @returns Download result with local path and file info
 */
export async function downloadFromS3ToFile(
  credentialProfile: S3Credentials,
  options: DownloadToFileOptions
): Promise<S3ServiceResponse<DownloadToFileResult>> {
  const startTime = Date.now();
  const { createWriteStream, promises: fsPromises } = await import('node:fs');
  const { dirname } = await import('node:path');
  const { Readable } = await import('node:stream');
  const { pipeline } = await import('node:stream/promises');

  try {
    const client = getClientFromProfile(credentialProfile);

    // Ensure directory exists
    await fsPromises.mkdir(dirname(options.localPath), { recursive: true });

    const command = new GetObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return {
        success: false,
        error: 'No body in S3 response',
        processingTime: Date.now() - startTime,
      };
    }

    // Stream the response body to a file
    const writeStream = createWriteStream(options.localPath);

    // Handle both Node.js Readable and web ReadableStream
    const bodyStream = response.Body as NodeJS.ReadableStream | ReadableStream<Uint8Array>;

    if ('pipe' in bodyStream && typeof bodyStream.pipe === 'function') {
      // Node.js Readable stream
      await pipeline(bodyStream as NodeJS.ReadableStream, writeStream);
    } else {
      // Web ReadableStream - convert to Node.js Readable
      const reader = (bodyStream as ReadableStream<Uint8Array>).getReader();
      const nodeReadable = new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        },
      });
      await pipeline(nodeReadable, writeStream);
    }

    return {
      success: true,
      data: {
        localPath: options.localPath,
        contentLength: response.ContentLength || 0,
        contentType: response.ContentType,
      },
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const s3Error = toS3Error(error);
    return {
      success: false,
      error: s3Error.message,
      processingTime: Date.now() - startTime,
    };
  }
}
