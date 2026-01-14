/**
 * Audit Logger
 * Centralized audit logging for security-sensitive operations
 */

import { db } from '~/db';
import { auditLogs } from '~/db/schema/auditLogs';
import type { NewAuditLog } from '~/db/schema/auditLogs';

/**
 * Extract client IP address from request
 */
function getClientIp(request: Request): string | null {
  // Try to get real IP from headers (for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - return null (will be handled by database as null)
  return null;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(params: {
  request: Request;
  action: string;
  resourceType: string;
  resourceId?: string;
  description: string;
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  durationMs?: number;
}): Promise<void> {
  try {
    const ipAddress = getClientIp(params.request);
    const userAgent = params.request.headers.get('user-agent');

    await db.insert(auditLogs).values({
      action: params.action as any, // Type assertion needed due to enum
      severity: params.severity || 'info',
      actorType: 'api_client',
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
      description: params.description,
      metadata: params.metadata || null,
      previousState: params.previousState || null,
      newState: params.newState || null,
      ipAddress: ipAddress as any, // Type assertion for inet type
      userAgent: userAgent,
      durationMs: params.durationMs,
    });
  } catch (error) {
    // Don't throw - audit logging shouldn't break the main operation
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Log successful credential access
 */
export async function logCredentialAccess(params: {
  request: Request;
  action: 'list' | 'read' | 'create' | 'update' | 'delete';
  credentialType: 's3' | 'intakeq';
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const actionMap = {
    s3: {
      list: 'credential_s3_list',
      read: 'credential_s3_read',
      create: 'credential_s3_create',
      update: 'credential_s3_update',
      delete: 'credential_s3_delete',
    },
    intakeq: {
      list: 'config_intakeq_read',
      read: 'config_intakeq_read',
      create: 'config_intakeq_create',
      update: 'config_intakeq_update',
      delete: 'config_intakeq_delete',
    },
  };

  const resourceTypeMap = {
    s3: 's3_credentials',
    intakeq: 'intakeq_settings',
  };

  await logAuditEvent({
    request: params.request,
    action: actionMap[params.credentialType][params.action],
    resourceType: resourceTypeMap[params.credentialType],
    resourceId: params.resourceId,
    description: `${params.credentialType.toUpperCase()} credential ${params.action}`,
    severity: params.action === 'delete' ? 'warning' : 'info',
    metadata: params.metadata,
  });
}

/**
 * Log failed operation
 */
export async function logFailedOperation(params: {
  request: Request;
  action: string;
  resourceType: string;
  resourceId?: string;
  error: Error | string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const errorMessage = typeof params.error === 'string' ? params.error : params.error.message;

  await logAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    description: `Failed: ${errorMessage}`,
    severity: 'error',
    metadata: {
      ...params.metadata,
      error: errorMessage,
    },
  });
}

/**
 * Log rate limited request
 */
export async function logRateLimited(params: {
  request: Request;
  action: string;
  resourceType: string;
  retryAfter: number;
}): Promise<void> {
  await logAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: params.resourceType,
    description: `Rate limited - retry after ${params.retryAfter}s`,
    severity: 'warning',
    metadata: {
      retryAfter: params.retryAfter,
      rateLimited: true,
    },
  });
}
