/**
 * S3 Service
 * High-level service for S3 operations with secure credential handling
 * Includes connection testing, bucket listing, and common S3 operations
 */

import {
  ListBucketsCommand,
  GetBucketLocationCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import type {
  S3TestConnectionResult,
  TestConnectionOptions,
  S3BucketInfo,
  S3ServiceResponse,
  S3Error,
  S3ErrorCode,
} from './types';
import { toS3Error } from './types';
import {
  getS3Client,
  getCachedDecryptedCredentials,
  clearCredentialCache,
  validateCredentials,
  logCredentialInfo,
} from './client';
import { decryptCredentials } from './crypto';
import type { S3Credentials } from '~/db/schema';

/**
 * Test S3 connection with the given credentials
 * @param credentialProfile - The credential profile from the database
 * @param options - Test connection options
 * @returns Test connection result
 */
export async function testS3Connection(
  credentialProfile: S3Credentials,
  options: TestConnectionOptions = {}
): Promise<S3ServiceResponse<S3TestConnectionResult>> {
  const startTime = Date.now();

  try {
    // Decrypt credentials
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

    // Validate credentials format
    const validation = validateCredentials(decrypted);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error || 'Invalid credentials',
        processingTime: Date.now() - startTime,
      };
    }

    // Create S3 client
    const client = getS3Client(credentialProfile.id, decrypted);

    // Test 1: Check if we can list buckets (tests basic permissions)
    const result: S3TestConnectionResult = {
      success: true,
      message: 'Successfully connected to S3',
      permissions: {
        canListBuckets: false,
        canGetBucketLocation: false,
      },
    };

    if (options.listBuckets !== false) {
      try {
        const listResponse = await client.send(new ListBucketsCommand({}));
        result.buckets = (listResponse.Buckets || []).map((bucket) => ({
          name: bucket.Name || '',
          creationDate: bucket.CreationDate || new Date(),
        }));
        result.permissions.canListBuckets = true;
      } catch (error) {
        const s3Error = toS3Error(error);
        if (s3Error.code === S3ErrorCode.ACCESS_DENIED) {
          result.permissions.canListBuckets = false;
          // Don't fail the test entirely if we can't list buckets
          result.message = 'Connected to S3 but cannot list all buckets';
        } else {
          throw s3Error;
        }
      }
    }

    // Test 2: Check bucket location if a specific bucket is provided
    if (options.testBucketName) {
      try {
        await client.send(
          new HeadBucketCommand({ Bucket: options.testBucketName })
        );
        result.permissions.canGetBucketLocation = true;

        // Try to get bucket location
        try {
          const locationResponse = await client.send(
            new GetBucketLocationCommand({ Bucket: options.testBucketName })
          );
          const region = locationResponse.LocationConstraint || 'us-east-1';
          result.message = `Successfully connected to S3 and verified bucket '${options.testBucketName}' in ${region}`;
        } catch (error) {
          // Bucket exists but we can't get location - not a fatal error
          const s3Error = toS3Error(error);
          if (s3Error.code !== S3ErrorCode.ACCESS_DENIED) {
            throw s3Error;
          }
        }
      } catch (error) {
        const s3Error = toS3Error(error);
        result.success = false;
        result.message = `Failed to access bucket '${options.testBucketName}'`;
        result.error = s3Error.message;
      }
    }

    return {
      success: true,
      data: result,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const s3Error = toS3Error(error);

    return {
      success: false,
      data: {
        success: false,
        message: s3Error.message,
        error: s3Error.message,
      },
      error: s3Error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * List all buckets accessible with the given credentials
 * @param credentialProfile - The credential profile from the database
 * @returns Service response with bucket list
 */
export async function listS3Buckets(
  credentialProfile: S3Credentials
): Promise<S3ServiceResponse<S3BucketInfo[]>> {
  const startTime = Date.now();

  try {
    // Decrypt credentials
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

    // Create S3 client
    const client = getS3Client(credentialProfile.id, decrypted);

    // List buckets
    const response = await client.send(new ListBucketsCommand({}));

    const buckets = (response.Buckets || []).map((bucket) => ({
      name: bucket.Name || '',
      creationDate: bucket.CreationDate || new Date(),
    }));

    return {
      success: true,
      data: buckets,
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
 * Get a specific credential profile's S3 client
 * This is for internal use by other S3 operations
 * @param credentialProfile - The credential profile from the database
 * @returns AWS S3 client instance
 */
export function getCredentialProfileClient(
  credentialProfile: S3Credentials
) {
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

/**
 * Clear credential cache for a specific profile
 * Useful when credentials are updated
 * @param credentialId - The credential profile ID
 */
export function clearProfileCredentialCache(credentialId: string): void {
  clearCredentialCache(credentialId);
}

/**
 * Validate a credential profile without testing S3 connection
 * @param credentialProfile - The credential profile from the database
 * @returns Service response with validation result
 */
export function validateCredentialProfile(
  credentialProfile: S3Credentials
): S3ServiceResponse<{ valid: boolean; message: string }> {
  const startTime = Date.now();

  try {
    // Try to decrypt credentials
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

    // Validate credentials format
    const validation = validateCredentials(decrypted);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error || 'Invalid credentials',
        processingTime: Date.now() - startTime,
      };
    }

    return {
      success: true,
      data: {
        valid: true,
        message: 'Credential profile is valid',
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
 * Initialize the S3 service
 * Should be called on application startup
 */
export function initializeS3Service(): void {
  console.log('S3 Service initialized');
}

// Export types for convenience
export type { S3TestConnectionResult, S3BucketInfo };
