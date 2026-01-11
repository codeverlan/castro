import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { auditLogs, sessions, noteTemplates } from '~/db/schema';
import { auditLogQuerySchema } from '~/lib/validations/sessionHistory';
import { createErrorResponse } from '~/lib/api-errors';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

/**
 * Sanitize audit log data to remove any potential PHI
 * This ensures compliance with HIPAA requirements
 */
function sanitizeAuditLogForDisplay(log: {
  id: string;
  action: string;
  severity: string;
  actorType: string;
  actorId: string | null;
  resourceType: string;
  resourceId: string | null;
  sessionId: string | null;
  templateId: string | null;
  description: string;
  metadata: unknown;
  previousState: unknown;
  newState: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  durationMs: number | null;
  createdAt: Date;
}) {
  // List of fields that might contain PHI and should be redacted
  const sensitiveFields = [
    'transcription',
    'noteContent',
    'plainTextContent',
    'rawContent',
    'processedContent',
    'userProvidedContent',
    'finalContent',
    'userResponse',
    'gapDescription',
    'userPrompt',
  ];

  // Helper to redact sensitive fields from objects
  const redactSensitiveData = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(redactSensitiveData);
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (sensitiveFields.includes(key)) {
        result[key] = '[REDACTED - PHI]';
      } else if (typeof value === 'object') {
        result[key] = redactSensitiveData(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return {
    id: log.id,
    action: log.action,
    severity: log.severity,
    actorType: log.actorType,
    actorId: log.actorId,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    sessionId: log.sessionId,
    templateId: log.templateId,
    // Redact description if it might contain PHI
    description: log.description.replace(/patient|client|name|dob|ssn/gi, '[REDACTED]'),
    // Redact sensitive fields from metadata
    metadata: redactSensitiveData(log.metadata),
    // Redact state changes to prevent PHI leakage
    previousState: redactSensitiveData(log.previousState),
    newState: redactSensitiveData(log.newState),
    // Keep system info for audit purposes
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    requestId: log.requestId,
    durationMs: log.durationMs,
    createdAt: log.createdAt.toISOString(),
  };
}

export const Route = createFileRoute('/api/audit-logs/')({
  server: {
    handlers: {
      /**
       * GET /api/audit-logs
       * Get audit logs with filtering capabilities
       * PHI is automatically redacted from responses
       *
       * Query parameters:
       * - sessionId: UUID (optional) - Filter by session
       * - templateId: UUID (optional) - Filter by template
       * - dateFrom: ISO datetime string (optional) - Start date filter
       * - dateTo: ISO datetime string (optional) - End date filter
       * - action: string (optional) - Filter by action type
       * - severity: string (optional) - Filter by severity level
       * - limit: number (default 50) - Pagination limit
       * - offset: number (default 0) - Pagination offset
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);

          // Parse query parameters
          const queryParams = {
            sessionId: url.searchParams.get('sessionId') || undefined,
            templateId: url.searchParams.get('templateId') || undefined,
            dateFrom: url.searchParams.get('dateFrom') || undefined,
            dateTo: url.searchParams.get('dateTo') || undefined,
            action: url.searchParams.get('action') || undefined,
            severity: url.searchParams.get('severity') || undefined,
            limit: url.searchParams.get('limit')
              ? parseInt(url.searchParams.get('limit')!, 10)
              : 50,
            offset: url.searchParams.get('offset')
              ? parseInt(url.searchParams.get('offset')!, 10)
              : 0,
          };

          // Validate query parameters
          const validatedQuery = auditLogQuerySchema.parse(queryParams);

          // Build where conditions
          const conditions = [];

          // Session filter
          if (validatedQuery.sessionId) {
            conditions.push(eq(auditLogs.sessionId, validatedQuery.sessionId));
          }

          // Template filter
          if (validatedQuery.templateId) {
            conditions.push(eq(auditLogs.templateId, validatedQuery.templateId));
          }

          // Date range filtering
          if (validatedQuery.dateFrom) {
            conditions.push(gte(auditLogs.createdAt, new Date(validatedQuery.dateFrom)));
          }
          if (validatedQuery.dateTo) {
            conditions.push(lte(auditLogs.createdAt, new Date(validatedQuery.dateTo)));
          }

          // Action filter
          if (validatedQuery.action) {
            conditions.push(eq(auditLogs.action, validatedQuery.action));
          }

          // Severity filter
          if (validatedQuery.severity) {
            conditions.push(eq(auditLogs.severity, validatedQuery.severity));
          }

          // Query audit logs
          const result = await db
            .select()
            .from(auditLogs)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(auditLogs.createdAt))
            .limit(validatedQuery.limit)
            .offset(validatedQuery.offset);

          // Get total count for pagination
          const allLogs = await db
            .select()
            .from(auditLogs)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

          const total = allLogs.length;

          // Sanitize logs to remove PHI before returning
          const sanitizedLogs = result.map(sanitizeAuditLogForDisplay);

          return Response.json({
            data: sanitizedLogs,
            pagination: {
              total,
              limit: validatedQuery.limit,
              offset: validatedQuery.offset,
              hasMore: validatedQuery.offset + result.length < total,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
