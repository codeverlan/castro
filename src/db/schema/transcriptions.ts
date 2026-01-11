import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions';

// Enum for transcription status
export const transcriptionStatusEnum = pgEnum('transcription_status', [
  'queued',      // Waiting in queue to be processed
  'processing',  // Currently being transcribed by Whisper
  'completed',   // Transcription finished successfully
  'failed',      // Transcription failed
  'retrying',    // Retrying after a failure
]);

// Enum for Whisper model size
export const whisperModelEnum = pgEnum('whisper_model', [
  'tiny',
  'base',
  'small',
  'medium',
  'large',
  'large-v2',
  'large-v3',
]);

// Transcriptions table - stores the output from Whisper
export const transcriptions = pgTable('transcriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' })
    .unique(),
  // Transcription status
  status: transcriptionStatusEnum('status').default('queued').notNull(),
  // Full transcription text
  fullText: text('full_text'),
  // Whisper model used
  modelUsed: whisperModelEnum('model_used'),
  // Language detected
  languageDetected: varchar('language_detected', { length: 10 }),
  // Language confidence score
  languageConfidence: real('language_confidence'),
  // Processing duration in milliseconds
  processingDurationMs: integer('processing_duration_ms'),
  // Number of retry attempts
  retryCount: integer('retry_count').default(0).notNull(),
  // Error message if failed
  errorMessage: text('error_message'),
  // Timestamps
  queuedAt: timestamp('queued_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Transcription Segments table - stores word-level or segment-level timing data
export const transcriptionSegments = pgTable('transcription_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  transcriptionId: uuid('transcription_id')
    .notNull()
    .references(() => transcriptions.id, { onDelete: 'cascade' }),
  // Segment index (order in the transcription)
  segmentIndex: integer('segment_index').notNull(),
  // Segment text
  text: text('text').notNull(),
  // Start time in seconds
  startTime: real('start_time').notNull(),
  // End time in seconds
  endTime: real('end_time').notNull(),
  // Confidence score (0-1)
  confidence: real('confidence'),
  // Speaker label if speaker diarization is enabled
  speakerLabel: varchar('speaker_label', { length: 50 }),
  // Whether this segment was flagged for low confidence
  lowConfidence: boolean('low_confidence').default(false).notNull(),
  // Word-level timing data (optional, stored as JSON)
  wordTimings: jsonb('word_timings'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Transcription Processing Queue table - manages the queue of audio files to process
export const transcriptionQueue = pgTable('transcription_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' })
    .unique(),
  // Priority in queue (lower = higher priority)
  priority: integer('priority').default(100).notNull(),
  // Number of attempts
  attempts: integer('attempts').default(0).notNull(),
  // Maximum allowed attempts
  maxAttempts: integer('max_attempts').default(3).notNull(),
  // Whether currently being processed
  isProcessing: boolean('is_processing').default(false).notNull(),
  // Locked until (for preventing concurrent processing)
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  // Worker ID that locked this item
  lockedBy: varchar('locked_by', { length: 255 }),
  // Last error message
  lastError: text('last_error'),
  // Scheduled processing time (for delayed processing)
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).defaultNow().notNull(),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define relations
export const transcriptionsRelations = relations(transcriptions, ({ one, many }) => ({
  session: one(sessions, {
    fields: [transcriptions.sessionId],
    references: [sessions.id],
  }),
  segments: many(transcriptionSegments),
}));

export const transcriptionSegmentsRelations = relations(transcriptionSegments, ({ one }) => ({
  transcription: one(transcriptions, {
    fields: [transcriptionSegments.transcriptionId],
    references: [transcriptions.id],
  }),
}));

export const transcriptionQueueRelations = relations(transcriptionQueue, ({ one }) => ({
  session: one(sessions, {
    fields: [transcriptionQueue.sessionId],
    references: [sessions.id],
  }),
}));

// Type exports
export type Transcription = typeof transcriptions.$inferSelect;
export type NewTranscription = typeof transcriptions.$inferInsert;
export type TranscriptionSegment = typeof transcriptionSegments.$inferSelect;
export type NewTranscriptionSegment = typeof transcriptionSegments.$inferInsert;
export type TranscriptionQueueItem = typeof transcriptionQueue.$inferSelect;
export type NewTranscriptionQueueItem = typeof transcriptionQueue.$inferInsert;
