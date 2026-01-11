import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { noteTemplates } from './noteTemplates';

// Enum for session processing status
export const sessionStatusEnum = pgEnum('session_status', [
  'pending',           // Audio file detected, waiting to process
  'transcribing',      // Whisper is processing the audio
  'transcribed',       // Transcription complete, waiting for mapping
  'mapping',           // LLM is mapping content to template
  'gaps_detected',     // Gaps found, waiting for user input
  'completing',        // User filled gaps, generating final note
  'completed',         // Final note generated successfully
  'failed',            // Processing failed at some stage
]);

// Enum for audio file formats
export const audioFormatEnum = pgEnum('audio_format', [
  'mp3',
  'wav',
  'm4a',
  'ogg',
  'webm',
]);

// Sessions table - represents a documentation session from audio to final note
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Reference to the template used for this session
  templateId: uuid('template_id')
    .notNull()
    .references(() => noteTemplates.id),
  // Session status
  status: sessionStatusEnum('status').default('pending').notNull(),
  // Original audio file path (local path for HIPAA compliance)
  audioFilePath: varchar('audio_file_path', { length: 1024 }).notNull(),
  // Audio file format
  audioFormat: audioFormatEnum('audio_format').notNull(),
  // Audio duration in seconds
  audioDuration: integer('audio_duration'),
  // Audio file size in bytes
  audioFileSize: integer('audio_file_size'),
  // Session metadata (e.g., client initials, session date - no PHI)
  metadata: jsonb('metadata'),
  // Error message if processing failed
  errorMessage: text('error_message'),
  // Processing timestamps
  processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
  processingCompletedAt: timestamp('processing_completed_at', { withTimezone: true }),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Session Section Content table - stores content mapped to each template section
export const sessionSectionContent = pgTable('session_section_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  // Section name (denormalized for flexibility)
  sectionName: varchar('section_name', { length: 255 }).notNull(),
  // Original section ID from template (for reference)
  templateSectionId: uuid('template_section_id'),
  // Raw content extracted from transcription
  rawContent: text('raw_content'),
  // Processed/edited content
  processedContent: text('processed_content'),
  // User-provided content (for gap filling)
  userProvidedContent: text('user_provided_content'),
  // Final merged content
  finalContent: text('final_content'),
  // Content confidence score from AI (0-100)
  confidenceScore: integer('confidence_score'),
  // Whether this section needs user review
  needsReview: boolean('needs_review').default(false).notNull(),
  // Display order
  displayOrder: integer('display_order').notNull(),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Import boolean from pg-core for needsReview
import { boolean } from 'drizzle-orm/pg-core';

// Session Gaps table - tracks identified gaps in documentation
export const sessionGaps = pgTable('session_gaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  // Reference to the section with the gap
  sectionContentId: uuid('section_content_id')
    .references(() => sessionSectionContent.id, { onDelete: 'cascade' }),
  // Description of the missing information
  gapDescription: text('gap_description').notNull(),
  // Prompt to show the user
  userPrompt: text('user_prompt').notNull(),
  // User's response
  userResponse: text('user_response'),
  // Whether this gap has been resolved
  isResolved: boolean('is_resolved').default(false).notNull(),
  // Priority order for presenting gaps to user
  priority: integer('priority').default(1).notNull(),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// Final Notes table - stores the generated clinical notes
export const finalNotes = pgTable('final_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' })
    .unique(),
  // The complete formatted note
  noteContent: text('note_content').notNull(),
  // Plain text version for copying
  plainTextContent: text('plain_text_content').notNull(),
  // Note format (e.g., "markdown", "html", "plain")
  format: varchar('format', { length: 50 }).default('plain').notNull(),
  // Word count
  wordCount: integer('word_count'),
  // Character count
  characterCount: integer('character_count'),
  // Whether the note has been exported/copied
  wasExported: boolean('was_exported').default(false).notNull(),
  // Export timestamp
  exportedAt: timestamp('exported_at', { withTimezone: true }),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define relations
export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  template: one(noteTemplates, {
    fields: [sessions.templateId],
    references: [noteTemplates.id],
  }),
  sectionContent: many(sessionSectionContent),
  gaps: many(sessionGaps),
  finalNote: one(finalNotes),
}));

export const sessionSectionContentRelations = relations(sessionSectionContent, ({ one, many }) => ({
  session: one(sessions, {
    fields: [sessionSectionContent.sessionId],
    references: [sessions.id],
  }),
  gaps: many(sessionGaps),
}));

export const sessionGapsRelations = relations(sessionGaps, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionGaps.sessionId],
    references: [sessions.id],
  }),
  sectionContent: one(sessionSectionContent, {
    fields: [sessionGaps.sectionContentId],
    references: [sessionSectionContent.id],
  }),
}));

export const finalNotesRelations = relations(finalNotes, ({ one }) => ({
  session: one(sessions, {
    fields: [finalNotes.sessionId],
    references: [sessions.id],
  }),
}));

// Type exports
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionSectionContent = typeof sessionSectionContent.$inferSelect;
export type NewSessionSectionContent = typeof sessionSectionContent.$inferInsert;
export type SessionGap = typeof sessionGaps.$inferSelect;
export type NewSessionGap = typeof sessionGaps.$inferInsert;
export type FinalNote = typeof finalNotes.$inferSelect;
export type NewFinalNote = typeof finalNotes.$inferInsert;
