import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessionGaps, sessions, sessionSectionContent } from '~/db/schema';
import { validateResolveGapRequest } from '~/services/gapDetection/validations';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq, and } from 'drizzle-orm';

export const Route = createFileRoute('/api/gaps/$id')({
  server: {
    handlers: {
      /**
       * GET /api/gaps/:id
       * Get a specific gap by ID
       */
      GET: async ({ params }) => {
        try {
          const { id } = params;

          const [gap] = await db
            .select()
            .from(sessionGaps)
            .where(eq(sessionGaps.id, id))
            .limit(1);

          if (!gap) {
            throw new NotFoundError(`Gap with ID ${id} not found`);
          }

          // Get related section content
          let sectionContent = null;
          if (gap.sectionContentId) {
            const [content] = await db
              .select()
              .from(sessionSectionContent)
              .where(eq(sessionSectionContent.id, gap.sectionContentId))
              .limit(1);
            sectionContent = content;
          }

          return Response.json({
            data: {
              ...gap,
              sectionName: sectionContent?.sectionName || 'Unknown Section',
              sectionContent: sectionContent?.rawContent || null,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * PUT /api/gaps/:id
       * Resolve a gap with user response
       */
      PUT: async ({ request, params }) => {
        try {
          const { id } = params;
          const body = await request.json();

          // Validate request
          const validation = validateResolveGapRequest({ gapId: id, ...body });
          if (!validation.success) {
            return Response.json(
              { error: 'Invalid request', details: validation.errors.format() },
              { status: 400 }
            );
          }

          const { userResponse } = validation.data;

          // Check if gap exists
          const [existingGap] = await db
            .select()
            .from(sessionGaps)
            .where(eq(sessionGaps.id, id))
            .limit(1);

          if (!existingGap) {
            throw new NotFoundError(`Gap with ID ${id} not found`);
          }

          // Update gap with user response
          const [updatedGap] = await db
            .update(sessionGaps)
            .set({
              userResponse,
              isResolved: true,
              resolvedAt: new Date(),
            })
            .where(eq(sessionGaps.id, id))
            .returning();

          // If the gap has a linked section, update the section's user-provided content
          if (existingGap.sectionContentId) {
            const [sectionContent] = await db
              .select()
              .from(sessionSectionContent)
              .where(eq(sessionSectionContent.id, existingGap.sectionContentId))
              .limit(1);

            if (sectionContent) {
              // Append user response to existing user-provided content
              const existingUserContent = sectionContent.userProvidedContent || '';
              const newUserContent = existingUserContent
                ? `${existingUserContent}\n\n${userResponse}`
                : userResponse;

              // Update final content to include user response
              const existingFinal = sectionContent.finalContent || sectionContent.processedContent || sectionContent.rawContent || '';
              const newFinalContent = existingFinal
                ? `${existingFinal}\n\n[Additional Information]\n${userResponse}`
                : userResponse;

              await db
                .update(sessionSectionContent)
                .set({
                  userProvidedContent: newUserContent,
                  finalContent: newFinalContent,
                  needsReview: false,
                  updatedAt: new Date(),
                })
                .where(eq(sessionSectionContent.id, existingGap.sectionContentId));
            }
          }

          // Check if all gaps are now resolved
          const unresolvedGaps = await db
            .select()
            .from(sessionGaps)
            .where(
              and(
                eq(sessionGaps.sessionId, existingGap.sessionId),
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
                updatedAt: new Date(),
              })
              .where(eq(sessions.id, existingGap.sessionId));
          }

          return Response.json({
            data: {
              gap: updatedGap,
              allGapsResolved: allResolved,
              message: allResolved
                ? 'All gaps resolved. Session ready for final note generation.'
                : 'Gap resolved successfully.',
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * DELETE /api/gaps/:id
       * Delete a gap (mark as not applicable)
       */
      DELETE: async ({ params }) => {
        try {
          const { id } = params;

          // Check if gap exists
          const [existingGap] = await db
            .select()
            .from(sessionGaps)
            .where(eq(sessionGaps.id, id))
            .limit(1);

          if (!existingGap) {
            throw new NotFoundError(`Gap with ID ${id} not found`);
          }

          // Delete the gap
          await db
            .delete(sessionGaps)
            .where(eq(sessionGaps.id, id));

          // Check if all remaining gaps are resolved
          const unresolvedGaps = await db
            .select()
            .from(sessionGaps)
            .where(
              and(
                eq(sessionGaps.sessionId, existingGap.sessionId),
                eq(sessionGaps.isResolved, false)
              )
            )
            .limit(1);

          const allResolved = unresolvedGaps.length === 0;

          // Update session status if no more gaps
          if (allResolved) {
            await db
              .update(sessions)
              .set({
                status: 'completing',
                updatedAt: new Date(),
              })
              .where(eq(sessions.id, existingGap.sessionId));
          }

          return Response.json({
            data: {
              deleted: true,
              allGapsResolved: allResolved,
              message: 'Gap dismissed successfully.',
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
