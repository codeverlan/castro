/**
 * IntakeQ Settings Schema
 * Database schema for storing IntakeQ API configuration
 * API key is encrypted at rest
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

// -----------------------------------------------------------------------------
// Table: intakeq_settings
// Stores encrypted IntakeQ API configuration
// -----------------------------------------------------------------------------

export const intakeqSettings = pgTable('intakeq_settings', {
  id: uuid('id').primaryKey().defaultRandom(),

  // API Key (encrypted)
  apiKey: text('api_key').notNull(),

  // Optional: Practitioner ID to filter appointments
  defaultPractitionerId: varchar('default_practitioner_id', { length: 255 }),

  // Whether this configuration is active
  isActive: boolean('is_active').default(true).notNull(),

  // Connection status
  lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
  lastTestResult: varchar('last_test_result', { length: 20 }), // 'success', 'failed'
  lastTestError: text('last_test_error'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type IntakeQSettings = typeof intakeqSettings.$inferSelect;
export type NewIntakeQSettings = typeof intakeqSettings.$inferInsert;
