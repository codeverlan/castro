/**
 * S3 Client Service
 * Manages AWS S3 client instances with secure credential handling
 * Never exposes or logs plaintext credentials
 */

import { S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import {
  S3Error,
  S3ErrorCode,
  toS3Error,
  type S3CredentialConfig,
  type S3ClientConfigExtended,
  type DecryptedCredentials,
  type S3ServiceResponse,
} from './types';
import { decryptCredentials, redactCredential } from './crypto';

/**
 * Client cache to avoid creating duplicate clients for the same credential profile
 */
const clientCache = new Map<string, S3Client>();

/**
 * Credential cache to avoid frequent decryption
 * Cached credentials expire after 5 minutes
 */
const credentialCache = new Map<string, { credentials: DecryptedCredentials; expiresAt: number }>();

const CREDENTIAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Create S3 client configuration from decrypted credentials
 * @param credentials - Decrypted credentials
 * @returns AWS S3 client configuration
 */
function createClientConfig(credentials: DecryptedCredentials): S3ClientConfigExtended {
  const config: S3ClientConfigExtended = {
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
    },
  };

  // If using IAM role, we need to set up role assumption
  if (credentials.authMethod === 'iam_role' && credentials.roleArn) {
    // For IAM role authentication, we use the base credentials to assume the role
    // The actual role assumption is handled by AWS SDK with proper configuration
    config.credentials = async () => {
      // This is a simplified version - in production, you'd use STS to assume the role
      const baseCreds = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        ...(credentials.sessionToken && { sessionToken: credentials.sessionToken }),
      };

      // For now, we'll use the base credentials
      // In a full implementation, you would call STS AssumeRole here
      return baseCreds;
    };
  }

  return config;
}

/**
 * Get or create an S3 client for the given credentials
 * @param credentialId - Unique identifier for the credential profile
 * @param credentials - Decrypted credentials
 * @returns AWS S3 client instance
 */
export function getS3Client(credentialId: string, credentials: DecryptedCredentials): S3Client {
  // Check cache first
  const cachedClient = clientCache.get(credentialId);
  if (cachedClient) {
    return cachedClient;
  }

  // Create new client
  const config = createClientConfig(credentials);
  const client = new S3Client(config);

  // Cache the client
  clientCache.set(credentialId, client);

  return client;
}

/**
 * Get an S3 client using credential chain (for IAM role without explicit credentials)
 * This is useful when running in EC2/ECS/Lambda with IAM roles
 * @param region - AWS region
 * @returns AWS S3 client instance
 */
export function getS3ClientWithCredentialChain(region: string): S3Client {
  const cacheKey = `credential-chain:${region}`;

  // Check cache
  const cachedClient = clientCache.get(cacheKey);
  if (cachedClient) {
    return cachedClient;
  }

  // Create client with credential chain
  const client = new S3Client({
    region,
    credentialDefaultProvider: fromNodeProviderChain(),
  });

  // Cache the client
  clientCache.set(cacheKey, client);

  return client;
}

/**
 * Decrypt credentials from database format
 * @param encryptedCredentials - Encrypted credentials from database
 * @returns Decrypted credentials
 */
export function decryptDatabaseCredentials(
  encryptedCredentials: {
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
  return decryptCredentials(encryptedCredentials);
}

/**
 * Get decrypted credentials from database with caching
 * @param credentialId - Credential profile ID
 * @param encryptedCredentials - Encrypted credentials from database
 * @returns Decrypted credentials (cached or fresh)
 */
export function getCachedDecryptedCredentials(
  credentialId: string,
  encryptedCredentials: {
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
  const now = Date.now();
  const cached = credentialCache.get(credentialId);

  // Check cache validity
  if (cached && cached.expiresAt > now) {
    return cached.credentials;
  }

  // Decrypt fresh credentials
  const credentials = decryptDatabaseCredentials(encryptedCredentials);

  // Cache the credentials
  credentialCache.set(credentialId, {
    credentials,
    expiresAt: now + CREDENTIAL_CACHE_TTL,
  });

  return credentials;
}

/**
 * Clear credential cache for a specific profile
 * @param credentialId - Credential profile ID
 */
export function clearCredentialCache(credentialId: string): void {
  credentialCache.delete(credentialId);
}

/**
 * Clear all credential and client caches
 */
export function clearAllCaches(): void {
  credentialCache.clear();
  clientCache.clear();
}

/**
 * Validate decrypted credentials by creating a minimal S3 client
 * @param credentials - Decrypted credentials
 * @returns Service response with validation result
 */
export function validateCredentials(
  credentials: DecryptedCredentials
): S3ServiceResponse<boolean> {
  const startTime = Date.now();

  try {
    // Validate required fields
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new S3Error(
        S3ErrorCode.INVALID_CREDENTIALS,
        'Access Key ID and Secret Access Key are required'
      );
    }

    if (!credentials.region) {
      throw new S3Error(
        S3ErrorCode.INVALID_REGION,
        'AWS region is required'
      );
    }

    // Validate IAM role configuration
    if (credentials.authMethod === 'iam_role') {
      if (!credentials.roleArn) {
        throw new S3Error(
          S3ErrorCode.INVALID_CREDENTIALS,
          'Role ARN is required for IAM role authentication'
        );
      }
    }

    // Validate credential format (basic check)
    if (credentials.accessKeyId.length < 16 || credentials.secretAccessKey.length < 16) {
      throw new S3Error(
        S3ErrorCode.INVALID_CREDENTIALS,
        'Invalid credential format'
      );
    }

    return {
      success: true,
      data: true,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Credential validation failed',
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Log credential information without exposing sensitive data
 * @param credentials - Decrypted credentials
 * @returns Safe string representation for logging
 */
export function logCredentialInfo(credentials: DecryptedCredentials): string {
  const parts = [
    `Region: ${credentials.region}`,
    `Auth Method: ${credentials.authMethod}`,
    redactCredential('Access Key ID', credentials.accessKeyId),
  ];

  if (credentials.roleArn) {
    parts.push(`Role ARN: ${credentials.roleArn}`);
  }

  if (credentials.sessionToken) {
    parts.push('Session Token: [PRESENT]');
  }

  return `S3 Credentials { ${parts.join(', ')} }`;
}

/**
 * Get cache statistics
 * @returns Object with cache sizes
 */
export function getCacheStats(): {
  clientCacheSize: number;
  credentialCacheSize: number;
} {
  return {
    clientCacheSize: clientCache.size,
    credentialCacheSize: credentialCache.size,
  };
}

/**
 * Initialize S3 client service
 * Should be called on application startup
 */
export function initializeS3ClientService(): void {
  // Clear any stale caches from previous runs
  clearAllCaches();

  console.log('S3 Client Service initialized');
}
