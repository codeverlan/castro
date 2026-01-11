import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  inet,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions';
import { noteTemplates } from './noteTemplates';

// Enum for audit action types
export const auditActionEnum = pgEnum('audit_action', [
  // Template actions
  'template_created',
  'template_updated',
  'template_deleted',
  'template_archived',
  'template_restored',
  // Session actions
  'session_created',
  'session_started',
  'session_completed',
  'session_failed',
  'session_deleted',
  // Transcription actions
  'transcription_started',
  'transcription_completed',
  'transcription_failed',
  'transcription_retried',
  // Content actions
  'content_mapped',
  'gap_detected',
  'gap_resolved',
  'content_edited',
  // Note actions
  'note_generated',
  'note_exported',
  'note_copied',
  // System actions
  'system_error',
  'configuration_changed',
  'file_watcher_started',
  'file_watcher_stopped',
]);

// Enum for audit log severity
export const auditSeverityEnum = pgEnum('audit_severity', [
  'debug',
  'info',
  'warning',
  'error',
  'critical',
]);

// Audit Logs table - comprehensive audit trail for compliance
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Action type
  action: auditActionEnum('action').notNull(),
  // Severity level
  severity: auditSeverityEnum('severity').default('info').notNull(),
  // Actor information (could be system or user identifier)
  actorType: varchar('actor_type', { length: 50 }).default('system').notNull(),
  actorId: varchar('actor_id', { length: 255 }),
  // Resource information
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  // Optional foreign keys for quick lookups
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  templateId: uuid('template_id').references(() => noteTemplates.id, { onDelete: 'set null' }),
  // Description of the action
  description: text('description').notNull(),
  // Additional metadata (JSON for flexibility)
  metadata: jsonb('metadata'),
  // Previous state (for tracking changes, stored as JSON)
  previousState: jsonb('previous_state'),
  // New state (for tracking changes, stored as JSON)
  newState: jsonb('new_state'),
  // Client information (for web requests)
  ipAddress: inet('ip_address'),
  userAgent: varchar('user_agent', { length: 500 }),
  // Request ID for tracing
  requestId: varchar('request_id', { length: 100 }),
  // Duration of the action in milliseconds (for performance tracking)
  durationMs: integer('duration_ms'),
  // Timestamp (immutable - no updatedAt for audit logs)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Import integer for durationMs
import { integer } from 'drizzle-orm/pg-core';

// System Events table - for tracking system-level events and errors
export const systemEvents = pgTable('system_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Event type
  eventType: varchar('event_type', { length: 100 }).notNull(),
  // Severity
  severity: auditSeverityEnum('severity').default('info').notNull(),
  // Component that generated the event
  component: varchar('component', { length: 100 }).notNull(),
  // Event message
  message: text('message').notNull(),
  // Stack trace if applicable
  stackTrace: text('stack_trace'),
  // Additional data
  eventData: jsonb('event_data'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Processing Metrics table - for tracking performance and usage
export const processingMetrics = pgTable('processing_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Session reference (optional)
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  // Metric type
  metricType: varchar('metric_type', { length: 100 }).notNull(),
  // Component being measured
  component: varchar('component', { length: 100 }).notNull(),
  // Metric value
  value: integer('value').notNull(),
  // Unit of measurement
  unit: varchar('unit', { length: 50 }).notNull(),
  // Additional labels/tags (JSON)
  labels: jsonb('labels'),
  // Timestamp
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  session: one(sessions, {
    fields: [auditLogs.sessionId],
    references: [sessions.id],
  }),
  template: one(noteTemplates, {
    fields: [auditLogs.templateId],
    references: [noteTemplates.id],
  }),
}));

export const processingMetricsRelations = relations(processingMetrics, ({ one }) => ({
  session: one(sessions, {
    fields: [processingMetrics.sessionId],
    references: [sessions.id],
  }),
}));

// Type exports
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type SystemEvent = typeof systemEvents.$inferSelect;
export type NewSystemEvent = typeof systemEvents.$inferInsert;
export type ProcessingMetric = typeof processingMetrics.$inferSelect;
export type NewProcessingMetric = typeof processingMetrics.$inferInsert;
