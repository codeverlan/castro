import { z } from 'zod';

// =============================================================================
// Zod Schemas for Session History
// =============================================================================
// These schemas provide runtime validation for session history queries
// including date range filtering, template type filtering, and audit trail viewing.
// =============================================================================

// -----------------------------------------------------------------------------
// Session Status Schema (matching database enum)
// -----------------------------------------------------------------------------

export const sessionStatusSchema = z.enum([
  'pending',
  'transcribing',
  'transcribed',
  'mapping',
  'gaps_detected',
  'completing',
  'completed',
  'failed',
]);

// -----------------------------------------------------------------------------
// Audit Log Schemas
// -----------------------------------------------------------------------------

export const auditActionSchema = z.enum([
  'template_created',
  'template_updated',
  'template_deleted',
  'template_archived',
  'template_restored',
  'session_created',
  'session_started',
  'session_completed',
  'session_failed',
  'session_deleted',
  'transcription_started',
  'transcription_completed',
  'transcription_failed',
  'transcription_retried',
  'content_mapped',
  'gap_detected',
  'gap_resolved',
  'content_edited',
  'note_generated',
  'note_exported',
  'note_copied',
  'system_error',
  'configuration_changed',
  'file_watcher_started',
  'file_watcher_stopped',
]);

export const auditSeveritySchema = z.enum([
  'debug',
  'info',
  'warning',
  'error',
  'critical',
]);

// -----------------------------------------------------------------------------
// Session History Query Schema
// -----------------------------------------------------------------------------

export const sessionHistoryQuerySchema = z.object({
  // Date range filtering
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  // Status filtering
  status: sessionStatusSchema.optional(),
  // Template type filtering
  templateType: z.string().optional(),
  templateId: z.string().uuid().optional(),
  // Search
  search: z.string().optional(),
  // Only show completed sessions (for history view)
  completedOnly: z.boolean().default(false),
  // Pagination
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  // Sort order
  sortBy: z.enum(['createdAt', 'completedAt', 'templateName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// -----------------------------------------------------------------------------
// Audit Log Query Schema
// -----------------------------------------------------------------------------

export const auditLogQuerySchema = z.object({
  // Filter by session
  sessionId: z.string().uuid().optional(),
  // Filter by template
  templateId: z.string().uuid().optional(),
  // Date range filtering
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  // Action type filtering
  action: auditActionSchema.optional(),
  // Severity filtering
  severity: auditSeveritySchema.optional(),
  // Pagination
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type AuditSeverity = z.infer<typeof auditSeveritySchema>;
export type SessionHistoryQuery = z.infer<typeof sessionHistoryQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
