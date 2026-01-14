/**
 * Sessions API Routes
 * Hono router for session management
 */

import { Hono } from 'hono';
import { db } from '~/db';
import { sessions, noteTemplates, finalNotes } from '~/db/schema';
import { sessionHistoryQuerySchema } from '~/lib/validations/sessionHistory';
import { createErrorResponse, ValidationError } from '~/lib/api-errors';
import { desc, asc, eq, and, gte, lte, ilike, sql } from 'drizzle-orm';

export const sessionsRouter = new Hono();

/**
 * GET /api/sessions
 * Get all sessions with their related data for the dashboard
 */
sessionsRouter.get('/', async (c) => {
  try {
    const limitParam = c.req.query('limit');
    const statusParam = c.req.query('status');

    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (isNaN(limit) || limit < 1 || limit > 200) {
      throw new ValidationError('limit must be a number between 1 and 200');
    }

    // Build the query
    const result = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        audioFilePath: sessions.audioFilePath,
        audioFormat: sessions.audioFormat,
        audioDuration: sessions.audioDuration,
        audioFileSize: sessions.audioFileSize,
        metadata: sessions.metadata,
        errorMessage: sessions.errorMessage,
        processingStartedAt: sessions.processingStartedAt,
        processingCompletedAt: sessions.processingCompletedAt,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        templateId: sessions.templateId,
        templateName: noteTemplates.name,
        hasNote: sql<boolean>`${finalNotes.id} IS NOT NULL`.as('has_note'),
      })
      .from(sessions)
      .leftJoin(noteTemplates, eq(sessions.templateId, noteTemplates.id))
      .leftJoin(finalNotes, eq(sessions.id, finalNotes.sessionId))
      .orderBy(desc(sessions.createdAt))
      .limit(limit);

    // Transform the data for the response
    const sessionsData = result.map((row) => ({
      id: row.id,
      status: row.status,
      audioFilePath: row.audioFilePath,
      audioFormat: row.audioFormat,
      audioDuration: row.audioDuration,
      audioFileSize: row.audioFileSize,
      metadata: row.metadata,
      errorMessage: row.errorMessage,
      processingStartedAt: row.processingStartedAt?.toISOString() ?? null,
      processingCompletedAt: row.processingCompletedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      templateId: row.templateId,
      templateName: row.templateName,
      hasNote: row.hasNote ?? false,
    }));

    return c.json({
      data: sessionsData,
      meta: {
        count: sessionsData.length,
        limit,
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
 * GET /api/sessions/history
 * Get historical sessions with filtering and search capabilities
 */
sessionsRouter.get('/history', async (c) => {
  try {
    // Parse query parameters
    const queryParams = {
      dateFrom: c.req.query('dateFrom') || undefined,
      dateTo: c.req.query('dateTo') || undefined,
      status: c.req.query('status') || undefined,
      templateType: c.req.query('templateType') || undefined,
      templateId: c.req.query('templateId') || undefined,
      search: c.req.query('search') || undefined,
      completedOnly: c.req.query('completedOnly') === 'true',
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0,
      sortBy:
        (c.req.query('sortBy') as 'createdAt' | 'completedAt' | 'templateName') ||
        'createdAt',
      sortOrder: (c.req.query('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // Validate query parameters
    const validatedQuery = sessionHistoryQuerySchema.parse(queryParams);

    // Build where conditions
    const conditions = [];

    // Date range filtering
    if (validatedQuery.dateFrom) {
      conditions.push(gte(sessions.createdAt, new Date(validatedQuery.dateFrom)));
    }
    if (validatedQuery.dateTo) {
      conditions.push(lte(sessions.createdAt, new Date(validatedQuery.dateTo)));
    }

    // Status filtering
    if (validatedQuery.status) {
      conditions.push(eq(sessions.status, validatedQuery.status));
    }

    // Only completed sessions filter
    if (validatedQuery.completedOnly) {
      conditions.push(eq(sessions.status, 'completed'));
    }

    // Template type filtering (join with noteTemplates)
    if (validatedQuery.templateType) {
      conditions.push(eq(noteTemplates.templateType, validatedQuery.templateType));
    }

    // Specific template filtering
    if (validatedQuery.templateId) {
      conditions.push(eq(sessions.templateId, validatedQuery.templateId));
    }

    // Search in audio file path (sanitized - no PHI in file paths)
    if (validatedQuery.search) {
      conditions.push(ilike(sessions.audioFilePath, `%${validatedQuery.search}%`));
    }

    // Determine sort column and order
    const getSortColumn = () => {
      switch (validatedQuery.sortBy) {
        case 'completedAt':
          return sessions.processingCompletedAt;
        case 'templateName':
          return noteTemplates.name;
        case 'createdAt':
        default:
          return sessions.createdAt;
      }
    };

    const sortColumn = getSortColumn();
    const orderBy = validatedQuery.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // Query sessions with template info and note status
    const result = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        audioFilePath: sessions.audioFilePath,
        audioFormat: sessions.audioFormat,
        audioDuration: sessions.audioDuration,
        audioFileSize: sessions.audioFileSize,
        metadata: sessions.metadata,
        errorMessage: sessions.errorMessage,
        processingStartedAt: sessions.processingStartedAt,
        processingCompletedAt: sessions.processingCompletedAt,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        templateId: sessions.templateId,
        templateName: noteTemplates.name,
        templateType: noteTemplates.templateType,
        hasNote: sql<boolean>`${finalNotes.id} IS NOT NULL`.as('has_note'),
        noteWordCount: finalNotes.wordCount,
        noteExported: finalNotes.wasExported,
      })
      .from(sessions)
      .leftJoin(noteTemplates, eq(sessions.templateId, noteTemplates.id))
      .leftJoin(finalNotes, eq(sessions.id, finalNotes.sessionId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(validatedQuery.limit)
      .offset(validatedQuery.offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .leftJoin(noteTemplates, eq(sessions.templateId, noteTemplates.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(countResult[0]?.count ?? 0);

    // Transform the data for the response
    const sessionsData = result.map((row) => ({
      id: row.id,
      status: row.status,
      audioFileName: row.audioFilePath.split('/').pop() || row.audioFilePath,
      audioFormat: row.audioFormat,
      audioDuration: row.audioDuration,
      audioFileSize: row.audioFileSize,
      metadata: row.metadata,
      errorMessage: row.errorMessage,
      processingStartedAt: row.processingStartedAt?.toISOString() ?? null,
      processingCompletedAt: row.processingCompletedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      templateId: row.templateId,
      templateName: row.templateName,
      templateType: row.templateType,
      hasNote: row.hasNote ?? false,
      noteWordCount: row.noteWordCount,
      noteExported: row.noteExported ?? false,
    }));

    return c.json({
      data: sessionsData,
      pagination: {
        total,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: validatedQuery.offset + sessionsData.length < total,
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
 * GET /api/sessions/:id/sections
 * Get section content for a specific session
 */
sessionsRouter.get('/:id/sections', async (c) => {
  try {
    const { id } = c.req.param();
    const { sessionSectionContent } = await import('~/db/schema');

    // Verify session exists
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
    });

    if (!session) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: `Session with ID ${id} not found` } },
        404
      );
    }

    // Get section content
    const content = await db.query.sessionSectionContent.findMany({
      where: eq(sessionSectionContent.sessionId, id),
      orderBy: [asc(sessionSectionContent.displayOrder)],
    });

    return c.json({ data: content });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});
