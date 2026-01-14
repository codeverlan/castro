/**
 * Session Recordings Schema
 * Database schema for tracking audio recordings uploaded via browser or file upload
 * Recordings are stored in S3 and linked to sessions for transcription
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions';
import { s3Credentials } from './s3Credentials';

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

// Recording source - how the audio was captured
export const recordingSourceEnum = pgEnum('recording_source', [
  'browser_dictation', // Recorded in browser using MediaRecorder
  'file_upload',       // Uploaded audio file
]);

// Recording status - lifecycle state
export const recordingStatusEnum = pgEnum('recording_status', [
  'uploading',   // Upload in progress (presigned URL issued)
  'uploaded',    // Successfully stored in S3
  'ready',       // Ready for transcription
  'attached',    // Linked to a session
  'failed',      // Upload or processing failed
]);

// -----------------------------------------------------------------------------
// Table: session_recordings
// Tracks audio recordings stored in S3 for transcription
// -----------------------------------------------------------------------------

export const sessionRecordings = pgTable('session_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Optional session link (null if uploaded without session selected)
  // Set to null if session is deleted (recordings persist)
  sessionId: uuid('session_id')
    .references(() => sessions.id, { onDelete: 'set null' }),

  // S3 storage information
  s3CredentialId: uuid('s3_credential_id')
    .notNull()
    .references(() => s3Credentials.id),
  s3Bucket: varchar('s3_bucket', { length: 255 }).notNull(),
  s3Key: varchar('s3_key', { length: 1024 }).notNull(),
  s3Region: varchar('s3_region', { length: 50 }).notNull(),

  // Recording metadata
  source: recordingSourceEnum('source').notNull(),
  status: recordingStatusEnum('status').default('uploading').notNull(),

  // File information
  originalFilename: varchar('original_filename', { length: 512 }),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size'),      // bytes
  duration: integer('duration'),        // seconds

  // Error handling
  errorMessage: text('error_message'),

  // Presigned URL info (for direct browser uploads)
  uploadUrl: text('upload_url'),
  uploadUrlExpiresAt: timestamp('upload_url_expires_at', { withTimezone: true }),

  // Timestamps
  recordedAt: timestamp('recorded_at', { withTimezone: true }),   // When audio was captured
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }),   // When upload completed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const sessionRecordingsRelations = relations(sessionRecordings, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionRecordings.sessionId],
    references: [sessions.id],
  }),
  s3Credential: one(s3Credentials, {
    fields: [sessionRecordings.s3CredentialId],
    references: [s3Credentials.id],
  }),
}));

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type SessionRecording = typeof sessionRecordings.$inferSelect;
export type NewSessionRecording = typeof sessionRecordings.$inferInsert;
