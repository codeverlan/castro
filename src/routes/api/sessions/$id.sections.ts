import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessionSectionContent } from '~/db/schema';
import { eq, asc } from 'drizzle-orm';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';

export const Route = createFileRoute('/api/sessions/$id/sections')({
  server: {
    handlers: {
      /**
       * GET /api/sessions/:id/sections
       * Get all section content for a session (for IntakeQ export)
       */
      GET: async ({ params }) => {
        try {
          const { id } = params;

          const sections = await db
            .select({
              id: sessionSectionContent.id,
              sessionId: sessionSectionContent.sessionId,
              sectionName: sessionSectionContent.sectionName,
              templateSectionId: sessionSectionContent.templateSectionId,
              rawContent: sessionSectionContent.rawContent,
              processedContent: sessionSectionContent.processedContent,
              userProvidedContent: sessionSectionContent.userProvidedContent,
              finalContent: sessionSectionContent.finalContent,
              confidenceScore: sessionSectionContent.confidenceScore,
              needsReview: sessionSectionContent.needsReview,
              displayOrder: sessionSectionContent.displayOrder,
            })
            .from(sessionSectionContent)
            .where(eq(sessionSectionContent.sessionId, id))
            .orderBy(asc(sessionSectionContent.displayOrder));

          if (sections.length === 0) {
            throw new NotFoundError(`No sections found for session: ${id}`);
          }

          return Response.json({
            data: sections,
            meta: {
              sessionId: id,
              count: sections.length,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
