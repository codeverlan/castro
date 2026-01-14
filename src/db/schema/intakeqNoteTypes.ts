import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * IntakeQ Note Types Schema
 * Stores IntakeQ form/note type definitions with their fields
 */

// Type for individual field definition within a note type
export interface IntakeQFieldDefinition {
  fieldId: string;           // IntakeQ field ID or CSS selector
  fieldName: string;         // Human-readable name
  fieldType: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'radio' | 'number';
  isRequired: boolean;
  options?: string[];        // For select/radio fields
  maxLength?: number;
  defaultValue?: string;
  description?: string;      // Help text about this field
  mappedSection?: string;    // Which template section this maps to
}

// IntakeQ Note Types table
export const intakeqNoteTypes = pgTable('intakeq_note_types', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic info
  name: varchar('name', { length: 255 }).notNull().unique(),  // e.g., "Individual Progress Note"
  description: text('description'),

  // IntakeQ form identification
  intakeqFormId: varchar('intakeq_form_id', { length: 255 }),  // If fetched from API
  urlPattern: varchar('url_pattern', { length: 512 }),          // Regex for browser extension matching

  // Field definitions as JSON array
  fields: jsonb('fields').notNull().$type<IntakeQFieldDefinition[]>(),

  // Metadata
  isActive: boolean('is_active').default(true).notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),  // For API sync tracking

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations will be defined after noteTemplates is updated with FK
export const intakeqNoteTypesRelations = relations(intakeqNoteTypes, ({ many }) => ({
  // templates: many(noteTemplates) - added after FK
}));

// Type exports
export type IntakeQNoteType = typeof intakeqNoteTypes.$inferSelect;
export type NewIntakeQNoteType = typeof intakeqNoteTypes.$inferInsert;
