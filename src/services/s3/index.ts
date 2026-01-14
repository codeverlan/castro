/**
 * S3 Service Index
 * Main entry point for S3 service exports
 */

// Types and interfaces
export {
  type S3AuthMethod,
  type S3CredentialConfig,
  type S3ClientConfigExtended,
  type S3TestConnectionResult,
  type S3BucketInfo,
  type S3ServiceResponse,
  type TestConnectionOptions,
  type DecryptedCredentials,
  type EncryptionOptions,
  type EncryptedData,
  S3ErrorCode,
  S3Error,
  toS3Error,
} from './types';

// Crypto utilities
export {
  encryptData,
  decryptData,
  encryptCredentials,
  decryptCredentials,
  redactCredential,
  validateEncryptionKey,
  generateEncryptionKey,
} from './crypto';

// Client management
export {
  getS3Client,
  getS3ClientWithCredentialChain,
  decryptDatabaseCredentials,
  getCachedDecryptedCredentials,
  clearCredentialCache,
  clearAllCaches,
  validateCredentials,
  logCredentialInfo,
  getCacheStats,
  initializeS3ClientService,
} from './client';

// High-level service
export {
  testS3Connection,
  listS3Buckets,
  getCredentialProfileClient,
  clearProfileCredentialCache,
  validateCredentialProfile,
  initializeS3Service,
  type S3TestConnectionResult as TestConnectionResult,
  type S3BucketInfo as BucketInfo,
} from './service';

// Upload/download operations
export {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  uploadToS3,
  deleteFromS3,
  getObjectInfo,
  objectExists,
  downloadFromS3ToFile,
  type PresignedUploadUrlOptions,
  type PresignedUploadUrlResult,
  type PresignedDownloadUrlOptions,
  type PresignedDownloadUrlResult,
  type S3UploadOptions,
  type S3UploadResult,
  type S3ObjectInfo,
  type DownloadToFileOptions,
  type DownloadToFileResult,
} from './upload';

// S3 key utilities
export {
  generateRecordingKey,
  getExtensionFromMimeType,
  parseRecordingKey,
} from './keys';
