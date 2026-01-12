/**
 * Zod Schemas for S3 Credentials
 * Runtime validation for S3 credential data
 * Mirrors the Drizzle schema with additional validation rules
 */

import { z } from 'zod';

// =============================================================================
// S3 Credentials Validation Schemas
// =============================================================================

// More permissive UUID regex (accepts any UUID format)
const permissiveUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// -----------------------------------------------------------------------------
// Enum Schemas
// -----------------------------------------------------------------------------

export const s3AuthMethodSchema = z.enum([
  'access_key',
  'iam_role',
]);

// AWS region validation
export const awsRegionSchema = z.string().min(2).max(50).regex(
  /^(us|eu|ap|sa|ca|me|af|cn)-(north|south|east|west|central)-[0-9]+$/,
  'Invalid AWS region format (e.g., us-east-1, eu-west-2)'
);

// AWS Access Key ID format (20 alphanumeric characters)
export const awsAccessKeyIdSchema = z.string().min(16).max(128);

// AWS Secret Access Key format (40 alphanumeric characters)
export const awsSecretAccessKeySchema = z.string().min(16).max(128);

// IAM Role ARN format
export const iamRoleArnSchema = z.string().regex(
  /^arn:aws:iam::\d{12}:role\/[a-zA-Z0-9_\+=,.@\-]+$/,
  'Invalid IAM role ARN format (e.g., arn:aws:iam::123456789012:role/MyRole)'
);

// S3 bucket name validation (S3 bucket naming rules)
export const s3BucketNameSchema = z.string().min(3).max(63).regex(
  /^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/,
  'Invalid S3 bucket name (use lowercase letters, numbers, and hyphens)'
);

// -----------------------------------------------------------------------------
// Test Connection Response Schema
// -----------------------------------------------------------------------------

export const s3TestConnectionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  buckets: z.array(z.object({
    name: z.string(),
    creationDate: z.coerce.date(),
    region: z.string().optional(),
  })).optional(),
  error: z.string().optional(),
});

// -----------------------------------------------------------------------------
// S3 Credentials Schemas
// -----------------------------------------------------------------------------

// Base credential fields
export const s3CredentialsBaseSchema = z.object({
  name: z.string()
    .min(1, 'Profile name is required')
    .max(255, 'Profile name must be 255 characters or less')
    .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Profile name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  region: awsRegionSchema,
  authMethod: s3AuthMethodSchema.default('access_key'),
  isDefault: z.boolean().default(false),
});

// Access key credential fields
export const s3AccessKeyCredentialsSchema = s3CredentialsBaseSchema.extend({
  authMethod: z.literal('access_key'),
  accessKeyId: awsAccessKeyIdSchema.min(1, 'Access Key ID is required'),
  secretAccessKey: awsSecretAccessKeySchema.min(1, 'Secret Access Key is required'),
  sessionToken: z.string().min(1).max(4096).optional().nullable(),
  roleArn: z.undefined().optional(),
  roleExternalId: z.undefined().optional(),
});

// IAM role credential fields
export const s3IamRoleCredentialsSchema = s3CredentialsBaseSchema.extend({
  authMethod: z.literal('iam_role'),
  accessKeyId: awsAccessKeyIdSchema.min(1, 'Access Key ID is required for role assumption'),
  secretAccessKey: awsSecretAccessKeySchema.min(1, 'Secret Access Key is required for role assumption'),
  roleArn: iamRoleArnSchema.min(1, 'Role ARN is required for IAM role authentication'),
  roleExternalId: z.string().min(1).max(2048).optional().nullable(),
  sessionToken: z.string().max(4096).optional().nullable(),
});

// Union schema for both auth methods
export const s3CredentialsSchema = z.discriminatedUnion('authMethod', [
  s3AccessKeyCredentialsSchema,
  s3IamRoleCredentialsSchema,
]);

// Add optional default bucket field
export const s3CredentialsWithBucketSchema = s3CredentialsSchema.and(
  z.object({
    defaultBucket: s3BucketNameSchema.optional().nullable(),
  })
);

// -----------------------------------------------------------------------------
// Create S3 Credentials Schema
// -----------------------------------------------------------------------------

export const createS3CredentialsSchema = s3CredentialsWithBucketSchema;

// -----------------------------------------------------------------------------
// Update S3 Credentials Schema
// -----------------------------------------------------------------------------

export const updateS3CredentialsSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional().nullable(),
  accessKeyId: awsAccessKeyIdSchema.optional(),
  secretAccessKey: awsSecretAccessKeySchema.optional(),
  region: awsRegionSchema.optional(),
  defaultBucket: s3BucketNameSchema.optional().nullable(),
  authMethod: s3AuthMethodSchema.optional(),
  sessionToken: z.string().max(4096).optional().nullable(),
  roleArn: iamRoleArnSchema.optional().nullable(),
  roleExternalId: z.string().max(2048).optional().nullable(),
  isDefault: z.boolean().optional(),
}).refine(
  (data) => {
    // If changing to IAM role auth, role ARN is required
    if (data.authMethod === 'iam_role' && !data.roleArn) {
      return false;
    }
    return true;
  },
  {
    message: 'Role ARN is required when using IAM role authentication',
    path: ['roleArn'],
  }
);

// -----------------------------------------------------------------------------
// Full S3 Credentials Schema (with database fields)
// -----------------------------------------------------------------------------

export const s3CredentialsFullSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  accessKeyId: awsAccessKeyIdSchema,
  secretAccessKey: awsSecretAccessKeySchema,
  region: awsRegionSchema,
  defaultBucket: s3BucketNameSchema.optional().nullable(),
  authMethod: s3AuthMethodSchema,
  sessionToken: z.string().max(4096).optional().nullable(),
  roleArn: iamRoleArnSchema.optional().nullable(),
  roleExternalId: z.string().max(2048).optional().nullable(),
  isDefault: z.boolean(),
  lastTestedAt: z.coerce.date().optional().nullable(),
  lastTestResult: z.enum(['success', 'failed']).optional().nullable(),
  lastTestError: z.string().optional().nullable(),
  credentialsExpireAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// -----------------------------------------------------------------------------
// API Request/Response Schemas
// -----------------------------------------------------------------------------

// List credentials query filters
export const s3CredentialsQuerySchema = z.object({
  authMethod: s3AuthMethodSchema.optional(),
  region: awsRegionSchema.optional(),
  isDefault: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// Test connection request
export const testS3ConnectionSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type S3AuthMethod = z.infer<typeof s3AuthMethodSchema>;
export type S3TestConnectionResult = z.infer<typeof s3TestConnectionResultSchema>;

export type S3CredentialsInput = z.infer<typeof s3CredentialsSchema>;
export type CreateS3CredentialsInput = z.infer<typeof createS3CredentialsSchema>;
export type UpdateS3CredentialsInput = z.infer<typeof updateS3CredentialsSchema>;
export type S3CredentialsFull = z.infer<typeof s3CredentialsFullSchema>;
export type S3CredentialsQueryInput = z.infer<typeof s3CredentialsQuerySchema>;
export type TestS3ConnectionInput = z.infer<typeof testS3ConnectionSchema>;
