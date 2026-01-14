import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  date,
} from 'drizzle-orm/pg-core';

// Clients table - stores client information for session association
// Can be synced from IntakeQ or manually entered
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  // IntakeQ client ID (for synced clients)
  intakeqClientId: varchar('intakeq_client_id', { length: 50 }),
  // Client name (required)
  name: varchar('name', { length: 255 }).notNull(),
  // Contact information (optional)
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  // Date of birth (for verification)
  dateOfBirth: date('date_of_birth'),
  // Whether this client was synced from IntakeQ
  isSyncedFromIntakeq: boolean('is_synced_from_intakeq').default(false).notNull(),
  // Last sync timestamp
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Additional metadata (custom fields, etc.)
  metadata: text('metadata'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// IntakeQ Field Mappings table - stores field mappings for different note types
export const intakeqFieldMappings = pgTable('intakeq_field_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Note type name (e.g., "Individual Progress Note")
  noteTypeName: varchar('note_type_name', { length: 100 }).notNull(),
  // URL pattern to match IntakeQ pages (regex)
  urlPattern: varchar('url_pattern', { length: 255 }),
  // Field mappings as JSON array
  // [{castroSection: "Subjective", intakeqSelector: "#field-123", fieldType: "textarea"}]
  mappings: text('mappings').notNull(),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Note: Client -> Sessions relation is defined in sessions.ts to avoid circular imports

// Type exports
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type IntakeqFieldMapping = typeof intakeqFieldMappings.$inferSelect;
export type NewIntakeqFieldMapping = typeof intakeqFieldMappings.$inferInsert;
