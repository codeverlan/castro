/**
 * Audit Logs API Routes
 * Hono router for audit log access
 */

import { Hono } from 'hono';
import { db } from '~/db';
import { auditLogs } from '~/db/schema';
import { createErrorResponse } from '~/lib/api-errors';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

export const auditLogsRouter = new Hono();

/**
 * GET /api/audit-logs
 * Get audit logs with optional filtering
 */
auditLogsRouter.get('/', async (c) => {
  try {
    const action = c.req.query('action') || undefined;
    const resourceType = c.req.query('resourceType') || undefined;
    const resourceId = c.req.query('resourceId') || undefined;
    const dateFrom = c.req.query('dateFrom');
    const dateTo = c.req.query('dateTo');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0;

    // Build where conditions
    const conditions = [];

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (resourceType) {
      conditions.push(eq(auditLogs.resourceType, resourceType));
    }

    if (resourceId) {
      conditions.push(eq(auditLogs.resourceId, resourceId));
    }

    if (dateFrom) {
      conditions.push(gte(auditLogs.timestamp, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(auditLogs.timestamp, new Date(dateTo)));
    }

    // Query audit logs
    const logs = await db.query.auditLogs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit,
      offset,
      orderBy: [desc(auditLogs.timestamp)],
    });

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count || 0;

    return c.json({
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/audit-logs/summary
 * Get audit log summary statistics
 */
auditLogsRouter.get('/summary', async (c) => {
  try {
    const days = c.req.query('days') ? parseInt(c.req.query('days')!, 10) : 7;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Get counts by action
    const actionCounts = await db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(gte(auditLogs.timestamp, sinceDate))
      .groupBy(auditLogs.action);

    // Get counts by resource type
    const resourceTypeCounts = await db
      .select({
        resourceType: auditLogs.resourceType,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(gte(auditLogs.timestamp, sinceDate))
      .groupBy(auditLogs.resourceType);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(gte(auditLogs.timestamp, sinceDate));

    return c.json({
      data: {
        totalLogs: totalResult[0]?.count || 0,
        period: {
          days,
          since: sinceDate.toISOString(),
        },
        byAction: actionCounts.reduce(
          (acc, item) => {
            acc[item.action] = item.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byResourceType: resourceTypeCounts.reduce(
          (acc, item) => {
            if (item.resourceType) {
              acc[item.resourceType] = item.count;
            }
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});
