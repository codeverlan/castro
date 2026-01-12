/**
 * S3 Service Types
 * Type definitions for S3 service operations
 */

import type { S3ClientConfig } from '@aws-sdk/client-s3';

// -----------------------------------------------------------------------------
// Authentication Methods
// -----------------------------------------------------------------------------

export type S3AuthMethod = 'access_key' | 'iam_role';

// -----------------------------------------------------------------------------
// Credential Configuration
// -----------------------------------------------------------------------------

export interface S3CredentialConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string | null;
  roleArn?: string | null;
  roleExternalId?: string | null;
  authMethod: S3AuthMethod;
}

// -----------------------------------------------------------------------------
// S3 Client Configuration
// -----------------------------------------------------------------------------

export interface S3ClientConfigExtended extends Omit<S3ClientConfig, 'credentials'> {
  credentials: S3CredentialConfig;
}

// -----------------------------------------------------------------------------
// Test Connection Result
// -----------------------------------------------------------------------------

export interface S3BucketInfo {
  name: string;
  creationDate: Date;
  region?: string;
}

export interface S3TestConnectionResult {
  success: boolean;
  message: string;
  buckets?: S3BucketInfo[];
  error?: string;
  permissions?: {
    canListBuckets: boolean;
    canGetBucketLocation: boolean;
  };
}

// -----------------------------------------------------------------------------
// Service Response Types
// -----------------------------------------------------------------------------

export interface S3ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number;
}

// -----------------------------------------------------------------------------
// Test Connection Options
// -----------------------------------------------------------------------------

export interface TestConnectionOptions {
  checkPermissions?: boolean;
  listBuckets?: boolean;
  testBucketName?: string;
}

// -----------------------------------------------------------------------------
// Credential Decryption Result
// -----------------------------------------------------------------------------

export interface DecryptedCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string | null;
  roleArn?: string | null;
  roleExternalId?: string | null;
  authMethod: S3AuthMethod;
}

// -----------------------------------------------------------------------------
// Encryption Options
// -----------------------------------------------------------------------------

export interface EncryptionOptions {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  authTagLength?: number;
}

// -----------------------------------------------------------------------------
// Encryption Result
// -----------------------------------------------------------------------------

export interface EncryptedData {
  iv: string;
  authTag: string;
  data: string;
  algorithm: string;
}

// -----------------------------------------------------------------------------
// S3 Operation Error Types
// -----------------------------------------------------------------------------

export enum S3ErrorCode {
  // Credential errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  CREDENTIALS_EXPIRED = 'CREDENTIALS_EXPIRED',

  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Permission errors
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  BUCKET_NOT_FOUND = 'BUCKET_NOT_FOUND',
  BUCKET_ACCESS_DENIED = 'BUCKET_ACCESS_DENIED',

  // Configuration errors
  INVALID_REGION = 'INVALID_REGION',
  INVALID_BUCKET_NAME = 'INVALID_BUCKET_NAME',
  INVALID_ROLE_ARN = 'INVALID_ROLE_ARN',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// -----------------------------------------------------------------------------
// S3 Error Types
// -----------------------------------------------------------------------------

export class S3Error extends Error {
  constructor(
    public code: S3ErrorCode,
    message: string,
    public originalError?: Error | unknown
  ) {
    super(message);
    this.name = 'S3Error';
  }

  /**
   * Check if this is a credential-related error
   */
  isCredentialError(): boolean {
    return [
      S3ErrorCode.INVALID_CREDENTIALS,
      S3ErrorCode.DECRYPTION_FAILED,
      S3ErrorCode.ENCRYPTION_FAILED,
      S3ErrorCode.CREDENTIALS_EXPIRED,
    ].includes(this.code);
  }

  /**
   * Check if this is a permission-related error
   */
  isPermissionError(): boolean {
    return [
      S3ErrorCode.ACCESS_DENIED,
      S3ErrorCode.INSUFFICIENT_PERMISSIONS,
      S3ErrorCode.BUCKET_ACCESS_DENIED,
    ].includes(this.code);
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    return [
      S3ErrorCode.NETWORK_ERROR,
      S3ErrorCode.TIMEOUT,
      S3ErrorCode.CONNECTION_FAILED,
    ].includes(this.code);
  }
}

/**
 * Convert an AWS error to S3Error
 */
export function toS3Error(error: unknown, defaultCode: S3ErrorCode = S3ErrorCode.UNKNOWN_ERROR): S3Error {
  if (error instanceof S3Error) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'Unknown S3 error occurred';
  const errorMessage = message.toLowerCase();

  // Detect error type from error message
  if (errorMessage.includes('invalidaccesskeyid') || errorMessage.includes('signaturedoesnotmatch')) {
    return new S3Error(S3ErrorCode.INVALID_CREDENTIALS, 'Invalid AWS credentials', error);
  }

  if (errorMessage.includes('accessdenied') || errorMessage.includes('unauthorized')) {
    return new S3Error(S3ErrorCode.ACCESS_DENIED, 'Access denied to S3 resource', error);
  }

  if (errorMessage.includes('nosuchbucket')) {
    return new S3Error(S3ErrorCode.BUCKET_NOT_FOUND, 'S3 bucket not found', error);
  }

  if (errorMessage.includes('region') && errorMessage.includes('invalid')) {
    return new S3Error(S3ErrorCode.INVALID_REGION, 'Invalid AWS region', error);
  }

  if (errorMessage.includes('network') || errorMessage.includes('enotfound') || errorMessage.includes('econnrefused')) {
    return new S3Error(S3ErrorCode.NETWORK_ERROR, 'Network connection error', error);
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return new S3Error(S3ErrorCode.TIMEOUT, 'Request timeout', error);
  }

  return new S3Error(defaultCode, message, error);
}
