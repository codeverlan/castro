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
