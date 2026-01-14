/**
 * S3 Credentials Schema
 * Database schema for storing encrypted AWS S3 credentials
 * Credentials are encrypted at rest using AES-256-GCM
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// -----------------------------------------------------------------------------
// Table: s3_credentials
// Stores encrypted AWS S3 credential profiles for S3 integration
// -----------------------------------------------------------------------------

export const s3Credentials = pgTable('s3_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Profile name (e.g., "production", "backup", "archive")
  name: varchar('name', { length: 255 }).notNull(),

  // Description of this credential profile
  description: varchar('description', { length: 500 }),

  // AWS Access Key ID (encrypted)
  accessKeyId: text('access_key_id').notNull(),

  // AWS Secret Access Key (encrypted)
  secretAccessKey: text('secret_access_key').notNull(),

  // AWS Region (e.g., "us-east-1", "us-west-2")
  region: varchar('region', { length: 50 }).notNull(),

  // Optional: Default bucket name for this credential profile
  defaultBucket: varchar('default_bucket', { length: 255 }),

  // Optional: Session token for temporary credentials (encrypted)
  sessionToken: text('session_token'),

  // Optional: Assume role ARN for IAM role-based authentication
  roleArn: varchar('role_arn', { length: 255 }),

  // Optional: External ID for role assumption (encrypted)
  roleExternalId: text('role_external_id'),

  // Authentication method: 'access_key' or 'iam_role'
  authMethod: varchar('auth_method', { length: 50 }).default('access_key').notNull(),

  // Whether this is the default credential profile
  isDefault: boolean('is_default').default(false).notNull(),

  // Connection status
  lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
  lastTestResult: varchar('last_test_result', { length: 20 }), // 'success', 'failed'
  lastTestError: text('last_test_error'),

  // Expiration for temporary credentials
  credentialsExpireAt: timestamp('credentials_expire_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

// Note: Import sessionRecordings in the relation function to avoid circular dependency
export const s3CredentialsRelations = relations(s3Credentials, ({ many }) => ({
  recordings: many(sessionRecordings),
}));

// Import sessionRecordings for relation (placed here to avoid circular imports at module level)
import { sessionRecordings } from './sessionRecordings';

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type S3Credentials = typeof s3Credentials.$inferSelect;
export type NewS3Credentials = typeof s3Credentials.$inferInsert;
