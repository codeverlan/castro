import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessions, noteTemplates, finalNotes } from '~/db/schema';
import { sessionHistoryQuerySchema } from '~/lib/validations/sessionHistory';
import { createErrorResponse } from '~/lib/api-errors';
import { desc, asc, eq, and, gte, lte, ilike, sql } from 'drizzle-orm';

export const Route = createFileRoute('/api/sessions/history')({
  server: {
    handlers: {
      /**
       * GET /api/sessions/history
       * Get historical sessions with filtering and search capabilities
       *
       * Query parameters:
       * - dateFrom: ISO datetime string (optional) - Start date filter
       * - dateTo: ISO datetime string (optional) - End date filter
       * - status: string (optional) - Filter by session status
       * - templateType: string (optional) - Filter by template type
       * - templateId: UUID (optional) - Filter by specific template
       * - search: string (optional) - Search in audio file path
       * - completedOnly: boolean (default false) - Only show completed sessions
       * - limit: number (default 50) - Pagination limit
       * - offset: number (default 0) - Pagination offset
       * - sortBy: 'createdAt' | 'completedAt' | 'templateName' (default 'createdAt')
       * - sortOrder: 'asc' | 'desc' (default 'desc')
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);

          // Parse query parameters
          const queryParams = {
            dateFrom: url.searchParams.get('dateFrom') || undefined,
            dateTo: url.searchParams.get('dateTo') || undefined,
            status: url.searchParams.get('status') || undefined,
            templateType: url.searchParams.get('templateType') || undefined,
            templateId: url.searchParams.get('templateId') || undefined,
            search: url.searchParams.get('search') || undefined,
            completedOnly: url.searchParams.get('completedOnly') === 'true',
            limit: url.searchParams.get('limit')
              ? parseInt(url.searchParams.get('limit')!, 10)
              : 50,
            offset: url.searchParams.get('offset')
              ? parseInt(url.searchParams.get('offset')!, 10)
              : 0,
            sortBy: (url.searchParams.get('sortBy') as 'createdAt' | 'completedAt' | 'templateName') || 'createdAt',
            sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
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
          // Note: We intentionally exclude PHI - only metadata and system info is returned
          const sessionsData = result.map((row) => ({
            id: row.id,
            status: row.status,
            // Only return file name, not full path (privacy consideration)
            audioFileName: row.audioFilePath.split('/').pop() || row.audioFilePath,
            audioFormat: row.audioFormat,
            audioDuration: row.audioDuration,
            audioFileSize: row.audioFileSize,
            // Metadata is structured data without PHI
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

          return Response.json({
            data: sessionsData,
            pagination: {
              total,
              limit: validatedQuery.limit,
              offset: validatedQuery.offset,
              hasMore: validatedQuery.offset + sessionsData.length < total,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
