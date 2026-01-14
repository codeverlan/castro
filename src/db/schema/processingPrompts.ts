import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Processing Prompts Schema
 * Stores reusable AI prompts for transcription processing
 */

// Enum for prompt type
export const promptTypeEnum = pgEnum('prompt_type', [
  'transform',  // Rewrite raw text (clinical language, format)
  'extract',    // Extract specific fields/sections
  'combined',   // Both transform and extract
]);

// Processing Prompts table
export const processingPrompts = pgTable('processing_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  promptType: promptTypeEnum('prompt_type').notNull(),

  // The actual prompt content
  systemPrompt: text('system_prompt').notNull(),        // System context for the AI
  userPromptTemplate: text('user_prompt_template').notNull(),  // Template with {{variables}}

  // Configuration
  outputFormat: varchar('output_format', { length: 50 }).default('markdown'),  // markdown, json, plain
  targetModel: varchar('target_model', { length: 100 }),  // e.g., 'llama3', 'gpt-4', null = default

  // Metadata
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  version: integer('version').default(1).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations will be defined after noteTemplates and sessions are updated
export const processingPromptsRelations = relations(processingPrompts, ({ many }) => ({
  // These will be populated once FKs are added to templates and sessions
}));

// Type exports
export type ProcessingPrompt = typeof processingPrompts.$inferSelect;
export type NewProcessingPrompt = typeof processingPrompts.$inferInsert;
