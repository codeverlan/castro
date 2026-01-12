/**
 * S3 Credentials Encryption/Decryption Utility
 * Encrypts S3 credentials at rest using AES-256-GCM
 * Never logs or exposes plaintext credentials
 */

import crypto from 'crypto';
import {
  S3Error,
  S3ErrorCode,
  toS3Error,
} from './types';
import type {
  EncryptionOptions,
  EncryptedData,
  DecryptedCredentials,
} from './types';

/**
 * Get encryption key from environment
 * Falls back to a secure default key for development
 * In production, this should be set via environment variable
 */
function getEncryptionKey(): Buffer {
  const keyFromEnv = process.env.S3_CREDENTIALS_ENCRYPTION_KEY;

  if (keyFromEnv) {
    // Validate key format (should be a hex string of 64 characters for 256-bit key)
    if (!/^[0-9a-fA-F]{64}$/.test(keyFromEnv)) {
      throw new S3Error(
        S3ErrorCode.ENCRYPTION_FAILED,
        'S3_CREDENTIALS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes for AES-256)'
      );
    }
    return Buffer.from(keyFromEnv, 'hex');
  }

  // Development fallback - generate a key from machine-specific data
  // DO NOT USE IN PRODUCTION
  const machineId = process.env.NODE_ENV === 'production'
    ? 'production-environment-key'
    : 'development-environment-key';

  // Use PBKDF2 to derive a key from the machine ID
  return crypto.pbkdf2Sync(
    machineId,
    's3-credentials-salt',
    100000,
    32, // 32 bytes for AES-256
    'sha256'
  );
}

/**
 * Encrypt sensitive credential data using AES-256-GCM
 * @param plaintext - The plaintext data to encrypt
 * @param options - Encryption options
 * @returns Encrypted data with IV and auth tag
 */
export function encryptData(
  plaintext: string,
  options?: EncryptionOptions
): EncryptedData {
  const algorithm = options?.algorithm || 'aes-256-gcm';
  const keyLength = options?.keyLength || 32; // 256 bits
  const ivLength = options?.ivLength || 16; // 96 bits for GCM (recommended)
  const authTagLength = options?.authTagLength || 16; // 128 bits

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(ivLength);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
      algorithm,
    };
  } catch (error) {
    throw toS3Error(error, S3ErrorCode.ENCRYPTION_FAILED);
  }
}

/**
 * Decrypt sensitive credential data using AES-256-GCM
 * @param encrypted - The encrypted data with IV and auth tag
 * @returns Decrypted plaintext data
 */
export function decryptData(encrypted: EncryptedData): string {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const encryptedData = Buffer.from(encrypted.data, 'hex');

    const decipher = crypto.createDecipheriv(encrypted.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw toS3Error(error, S3ErrorCode.DECRYPTION_FAILED);
  }
}

/**
 * Encrypt all credential fields
 * @param credentials - The credentials object to encrypt
 * @returns Encrypted credential fields
 */
export function encryptCredentials(
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string | null;
    roleExternalId?: string | null;
  }
): {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string | null;
  roleExternalId: string | null;
} {
  try {
    const result = {
      accessKeyId: JSON.stringify(encryptData(credentials.accessKeyId)),
      secretAccessKey: JSON.stringify(encryptData(credentials.secretAccessKey)),
      sessionToken: credentials.sessionToken
        ? JSON.stringify(encryptData(credentials.sessionToken))
        : null,
      roleExternalId: credentials.roleExternalId
        ? JSON.stringify(encryptData(credentials.roleExternalId))
        : null,
    };

    return result;
  } catch (error) {
    throw toS3Error(error, S3ErrorCode.ENCRYPTION_FAILED);
  }
}

/**
 * Decrypt all credential fields
 * @param credentials - The encrypted credentials from the database
 * @returns Decrypted credentials object
 */
export function decryptCredentials(
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string | null;
    roleArn?: string | null;
    roleExternalId?: string | null;
    authMethod: string;
    credentialsExpireAt?: Date | null;
  }
): DecryptedCredentials {
  try {
    // Check if credentials have expired
    if (credentials.credentialsExpireAt && credentials.credentialsExpireAt < new Date()) {
      throw new S3Error(
        S3ErrorCode.CREDENTIALS_EXPIRED,
        'S3 credentials have expired'
      );
    }

    const accessKeyId = decryptData(JSON.parse(credentials.accessKeyId));
    const secretAccessKey = decryptData(JSON.parse(credentials.secretAccessKey));
    const sessionToken = credentials.sessionToken
      ? decryptData(JSON.parse(credentials.sessionToken))
      : null;
    const roleExternalId = credentials.roleExternalId
      ? decryptData(JSON.parse(credentials.roleExternalId))
      : null;

    return {
      accessKeyId,
      secretAccessKey,
      region: credentials.region,
      sessionToken,
      roleArn: credentials.roleArn || undefined,
      roleExternalId,
      authMethod: credentials.authMethod as 'access_key' | 'iam_role',
    };
  } catch (error) {
    if (error instanceof S3Error) {
      throw error;
    }
    throw toS3Error(error, S3ErrorCode.DECRYPTION_FAILED);
  }
}

/**
 * Securely log a credential value (for debugging - NEVER log plaintext)
 * @param label - Label for the credential (e.g., "Access Key ID")
 * @param value - The credential value to redact
 * @returns Redacted string suitable for logging
 */
export function redactCredential(label: string, value: string): string {
  if (!value || value.length < 8) {
    return `${label}: [REDACTED]`;
  }

  const prefix = value.substring(0, 4);
  const suffix = value.substring(value.length - 4);
  const maskedLength = Math.max(4, value.length - 8);

  return `${label}: ${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}

/**
 * Validate encryption key is properly configured
 * @returns true if encryption key is valid
 */
export function validateEncryptionKey(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch (error) {
    console.error('Encryption key validation failed:', error);
    return false;
  }
}

/**
 * Generate a random encryption key for development/testing
 * DO NOT USE IN PRODUCTION
 * @returns A 64-character hex string representing a 256-bit key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
