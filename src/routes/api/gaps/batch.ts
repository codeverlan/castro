import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessionGaps, sessions, sessionSectionContent } from '~/db/schema';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq, and, inArray } from 'drizzle-orm';
import { submitGapResponsesSchema } from '~/lib/validations/gapPrompt';

export const Route = createFileRoute('/api/gaps/batch')({
  server: {
    handlers: {
      /**
       * POST /api/gaps/batch
       * Submit multiple gap responses at once
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate request
          const validation = submitGapResponsesSchema.safeParse(body);
          if (!validation.success) {
            return Response.json(
              { error: 'Invalid request', details: validation.error.format() },
              { status: 400 }
            );
          }

          const { sessionId, responses } = validation.data;

          // Check if session exists
          const [session] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

          if (!session) {
            throw new NotFoundError(`Session with ID ${sessionId} not found`);
          }

          // Get all gaps for this session
          const gapIds = responses.map((r) => r.gapId);
          const existingGaps = await db
            .select()
            .from(sessionGaps)
            .where(
              and(
                eq(sessionGaps.sessionId, sessionId),
                inArray(sessionGaps.id, gapIds)
              )
            );

          // Verify all gaps exist and belong to this session
          const existingGapIds = new Set(existingGaps.map((g) => g.id));
          const missingGaps = gapIds.filter((id) => !existingGapIds.has(id));

          if (missingGaps.length > 0) {
            return Response.json(
              {
                error: 'Some gaps not found',
                details: { missingGapIds: missingGaps },
              },
              { status: 400 }
            );
          }

          // Process each response
          const results = [];
          const now = new Date();

          for (const response of responses) {
            const { gapId, value } = response;
            const gap = existingGaps.find((g) => g.id === gapId);

            if (!gap) continue;

            // Skip if value is null/empty (user skipped this gap)
            if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
              results.push({
                gapId,
                status: 'skipped',
              });
              continue;
            }

            // Convert value to string for storage
            const userResponse = Array.isArray(value)
              ? value.join(', ')
              : typeof value === 'boolean'
              ? value ? 'Yes' : 'No'
              : String(value);

            // Update gap with user response
            const [updatedGap] = await db
              .update(sessionGaps)
              .set({
                userResponse,
                isResolved: true,
                resolvedAt: now,
              })
              .where(eq(sessionGaps.id, gapId))
              .returning();

            // If the gap has a linked section, update the section's user-provided content
            if (gap.sectionContentId) {
              const [sectionContent] = await db
                .select()
                .from(sessionSectionContent)
                .where(eq(sessionSectionContent.id, gap.sectionContentId))
                .limit(1);

              if (sectionContent) {
                // Append user response to existing user-provided content
                const existingUserContent = sectionContent.userProvidedContent || '';
                const newUserContent = existingUserContent
                  ? `${existingUserContent}\n\n${userResponse}`
                  : userResponse;

                // Update final content to include user response
                const existingFinal =
                  sectionContent.finalContent ||
                  sectionContent.processedContent ||
                  sectionContent.rawContent ||
                  '';
                const newFinalContent = existingFinal
                  ? `${existingFinal}\n\n[Additional Information]\n${userResponse}`
                  : userResponse;

                await db
                  .update(sessionSectionContent)
                  .set({
                    userProvidedContent: newUserContent,
                    finalContent: newFinalContent,
                    needsReview: false,
                    updatedAt: now,
                  })
                  .where(eq(sessionSectionContent.id, gap.sectionContentId));
              }
            }

            results.push({
              gapId,
              status: 'resolved',
              gap: updatedGap,
            });
          }

          // Check if all gaps are now resolved
          const unresolvedGaps = await db
            .select()
            .from(sessionGaps)
            .where(
              and(
                eq(sessionGaps.sessionId, sessionId),
                eq(sessionGaps.isResolved, false)
              )
            )
            .limit(1);

          const allResolved = unresolvedGaps.length === 0;

          // Update session status if all gaps resolved
          if (allResolved) {
            await db
              .update(sessions)
              .set({
                status: 'completing',
                updatedAt: now,
              })
              .where(eq(sessions.id, sessionId));
          }

          return Response.json({
            data: {
              results,
              summary: {
                total: responses.length,
                resolved: results.filter((r) => r.status === 'resolved').length,
                skipped: results.filter((r) => r.status === 'skipped').length,
              },
              allGapsResolved: allResolved,
              message: allResolved
                ? 'All gaps resolved. Session ready for final note generation.'
                : `${results.filter((r) => r.status === 'resolved').length} gap(s) resolved successfully.`,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
