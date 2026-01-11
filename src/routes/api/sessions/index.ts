import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessions, noteTemplates, finalNotes } from '~/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { createErrorResponse, ValidationError } from '~/lib/api-errors';

export const Route = createFileRoute('/api/sessions/')({
  server: {
    handlers: {
      /**
       * GET /api/sessions
       * Get all sessions with their related data for the dashboard
       *
       * Query parameters:
       * - limit: number (optional, default 50) - Maximum number of sessions to return
       * - status: string (optional) - Filter by status
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limitParam = url.searchParams.get('limit');
          const statusParam = url.searchParams.get('status');

          const limit = limitParam ? parseInt(limitParam, 10) : 50;

          if (isNaN(limit) || limit < 1 || limit > 200) {
            throw new ValidationError('limit must be a number between 1 and 200');
          }

          // Build the query
          let query = db
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

          // Execute the query
          const result = await query;

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

          return Response.json({
            data: sessionsData,
            meta: {
              count: sessionsData.length,
              limit,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
