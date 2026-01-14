/**
 * Zod Schemas for Session Recordings
 * Runtime validation for recording upload and management
 */

import { z } from 'zod';

// =============================================================================
// Recording Validation Schemas
// =============================================================================

// More permissive UUID regex
const permissiveUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// -----------------------------------------------------------------------------
// Enum Schemas
// -----------------------------------------------------------------------------

export const recordingSourceSchema = z.enum([
  'browser_dictation',
  'file_upload',
]);

export const recordingStatusSchema = z.enum([
  'uploading',
  'uploaded',
  'ready',
  'attached',
  'failed',
]);

// -----------------------------------------------------------------------------
// Audio MIME Types
// -----------------------------------------------------------------------------

// Allowed audio MIME types for transcription
export const allowedAudioMimeTypes = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
] as const;

// Schema for validating audio MIME type
export const audioMimeTypeSchema = z.string().refine(
  (val) => {
    const baseMime = val.split(';')[0].toLowerCase();
    return allowedAudioMimeTypes.some((t) => {
      const baseAllowed = t.split(';')[0];
      return baseMime === baseAllowed || val.toLowerCase() === t;
    });
  },
  { message: 'Unsupported audio format. Supported: WebM, MP3, WAV, OGG, M4A' }
);

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// Maximum file size: 500MB
export const MAX_RECORDING_FILE_SIZE = 500 * 1024 * 1024;

// Maximum recording duration: 60 minutes (3600 seconds)
export const MAX_RECORDING_DURATION = 60 * 60;

// -----------------------------------------------------------------------------
// Create Recording Schema (Request presigned URL)
// -----------------------------------------------------------------------------

export const createRecordingSchema = z.object({
  source: recordingSourceSchema,
  contentType: audioMimeTypeSchema,
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_RECORDING_FILE_SIZE, `File size cannot exceed ${MAX_RECORDING_FILE_SIZE / 1024 / 1024}MB`)
    .optional(),
  sessionId: z
    .string()
    .regex(permissiveUuidRegex, 'Invalid session ID format')
    .optional(),
  originalFilename: z.string().max(512).optional(),
}).refine(
  (data) => {
    // Browser dictation requires a session to be selected
    if (data.source === 'browser_dictation' && !data.sessionId) {
      return false;
    }
    return true;
  },
  {
    message: 'Session must be selected for browser dictation',
    path: ['sessionId'],
  }
);

// -----------------------------------------------------------------------------
// Complete Upload Schema (Mark upload as complete)
// -----------------------------------------------------------------------------

export const completeUploadSchema = z.object({
  duration: z
    .number()
    .int()
    .positive()
    .max(MAX_RECORDING_DURATION, `Recording duration cannot exceed ${MAX_RECORDING_DURATION / 60} minutes`)
    .optional(),
  fileSize: z.number().int().positive().optional(),
});

// -----------------------------------------------------------------------------
// Attach Recording Schema
// -----------------------------------------------------------------------------

export const attachRecordingSchema = z.object({
  sessionId: z.string().regex(permissiveUuidRegex, 'Invalid session ID format'),
});

// -----------------------------------------------------------------------------
// Recording Query Schema
// -----------------------------------------------------------------------------

export const recordingQuerySchema = z.object({
  sessionId: z
    .string()
    .regex(permissiveUuidRegex, 'Invalid session ID format')
    .optional(),
  source: recordingSourceSchema.optional(),
  status: recordingStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// -----------------------------------------------------------------------------
// Recording ID Parameter Schema
// -----------------------------------------------------------------------------

export const recordingIdSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, 'Invalid recording ID format'),
});

// -----------------------------------------------------------------------------
// Full Recording Schema (Database record)
// -----------------------------------------------------------------------------

export const recordingFullSchema = z.object({
  id: z.string().regex(permissiveUuidRegex),
  sessionId: z.string().regex(permissiveUuidRegex).nullable(),
  s3CredentialId: z.string().regex(permissiveUuidRegex),
  s3Bucket: z.string().min(1),
  s3Key: z.string().min(1),
  s3Region: z.string().min(1),
  source: recordingSourceSchema,
  status: recordingStatusSchema,
  originalFilename: z.string().nullable(),
  mimeType: z.string(),
  fileSize: z.number().nullable(),
  duration: z.number().nullable(),
  errorMessage: z.string().nullable(),
  uploadUrl: z.string().nullable(),
  uploadUrlExpiresAt: z.coerce.date().nullable(),
  recordedAt: z.coerce.date().nullable(),
  uploadedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// -----------------------------------------------------------------------------
// API Response Schemas
// -----------------------------------------------------------------------------

// Create recording response
export const createRecordingResponseSchema = z.object({
  recordingId: z.string().regex(permissiveUuidRegex),
  uploadUrl: z.string().url(),
  uploadUrlExpiresAt: z.string().datetime(),
  s3Bucket: z.string(),
  s3Key: z.string(),
});

// Recording list response
export const recordingListResponseSchema = z.object({
  recordings: z.array(recordingFullSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type RecordingSource = z.infer<typeof recordingSourceSchema>;
export type RecordingStatus = z.infer<typeof recordingStatusSchema>;
export type CreateRecordingInput = z.infer<typeof createRecordingSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type AttachRecordingInput = z.infer<typeof attachRecordingSchema>;
export type RecordingQueryInput = z.infer<typeof recordingQuerySchema>;
export type RecordingIdInput = z.infer<typeof recordingIdSchema>;
export type RecordingFull = z.infer<typeof recordingFullSchema>;
export type CreateRecordingResponse = z.infer<typeof createRecordingResponseSchema>;
export type RecordingListResponse = z.infer<typeof recordingListResponseSchema>;
