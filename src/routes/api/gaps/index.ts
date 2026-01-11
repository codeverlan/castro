import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessions, sessionSectionContent, sessionGaps, templateSections } from '~/db/schema';
import { gapDetectionEngine } from '~/services/gapDetection';
import { templateSectionToMappingInfo } from '~/services/contentMapping';
import {
  validateAnalyzeGapsRequest,
  validateGetGapsRequest,
} from '~/services/gapDetection/validations';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq, and, asc, desc } from 'drizzle-orm';
import type { MappedSectionContent } from '~/services/contentMapping/types';

export const Route = createFileRoute('/api/gaps/')({
  server: {
    handlers: {
      /**
       * GET /api/gaps?sessionId=...
       * Get gaps for a session
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const queryParams = {
            sessionId: url.searchParams.get('sessionId') || '',
            includeResolved: url.searchParams.get('includeResolved') === 'true',
            severity: url.searchParams.get('severity') || undefined,
          };

          // Validate query parameters
          const validation = validateGetGapsRequest(queryParams);
          if (!validation.success) {
            return Response.json(
              { error: 'Invalid request', details: validation.errors.format() },
              { status: 400 }
            );
          }

          const { sessionId, includeResolved, severity } = validation.data;

          // Check if session exists
          const [session] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

          if (!session) {
            throw new NotFoundError(`Session with ID ${sessionId} not found`);
          }

          // Build conditions for gaps query
          const conditions = [eq(sessionGaps.sessionId, sessionId)];
          if (!includeResolved) {
            conditions.push(eq(sessionGaps.isResolved, false));
          }

          // Get gaps
          const gaps = await db
            .select()
            .from(sessionGaps)
            .where(and(...conditions))
            .orderBy(asc(sessionGaps.priority));

          // Get related section content for context
          const sectionContent = await db
            .select()
            .from(sessionSectionContent)
            .where(eq(sessionSectionContent.sessionId, sessionId))
            .orderBy(asc(sessionSectionContent.displayOrder));

          // Enhance gaps with section info
          const enhancedGaps = gaps.map(gap => {
            const section = sectionContent.find(s => s.id === gap.sectionContentId);
            return {
              ...gap,
              sectionName: section?.sectionName || 'Unknown Section',
              sectionContent: section?.rawContent || null,
            };
          });

          // Filter by severity if specified
          const filteredGaps = severity
            ? enhancedGaps.filter(g =>
                g.gapDescription.toLowerCase().includes(severity.toLowerCase())
              )
            : enhancedGaps;

          // Calculate summary stats
          const summary = {
            total: filteredGaps.length,
            resolved: gaps.filter(g => g.isResolved).length,
            unresolved: gaps.filter(g => !g.isResolved).length,
          };

          return Response.json({
            data: {
              gaps: filteredGaps,
              summary,
              sessionStatus: session.status,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * POST /api/gaps
       * Analyze a session for gaps
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate request body
          const validation = validateAnalyzeGapsRequest(body);
          if (!validation.success) {
            return Response.json(
              { error: 'Invalid request', details: validation.errors.format() },
              { status: 400 }
            );
          }

          const { sessionId, options } = validation.data;

          // Get session with template
          const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, sessionId),
            with: {
              template: {
                with: {
                  sections: {
                    orderBy: [asc(templateSections.displayOrder)],
                  },
                },
              },
            },
          });

          if (!session) {
            throw new NotFoundError(`Session with ID ${sessionId} not found`);
          }

          // Get mapped section content
          const sectionContent = await db
            .select()
            .from(sessionSectionContent)
            .where(eq(sessionSectionContent.sessionId, sessionId))
            .orderBy(asc(sessionSectionContent.displayOrder));

          if (sectionContent.length === 0) {
            return Response.json(
              { error: 'Session has no mapped content. Run content mapping first.' },
              { status: 400 }
            );
          }

          // Convert to the format expected by gap detection engine
          const mappedSections: MappedSectionContent[] = sectionContent.map(sc => ({
            sectionId: sc.templateSectionId || sc.id,
            sectionName: sc.sectionName,
            rawContent: sc.rawContent || '',
            processedContent: sc.processedContent || '',
            confidence: sc.confidenceScore || 0,
            extractedKeywords: [],
            needsReview: sc.needsReview,
            displayOrder: sc.displayOrder,
          }));

          // Convert template sections to mapping info
          const templateSectionInfos = session.template.sections.map(s =>
            templateSectionToMappingInfo(s)
          );

          // Run gap detection
          const result = await gapDetectionEngine.detectGaps(
            {
              sessionId,
              mappedSections,
              templateSections: templateSectionInfos,
            },
            options
          );

          if (!result.success) {
            return Response.json(
              { error: 'Gap detection failed', details: result.error },
              { status: 500 }
            );
          }

          // Store detected gaps in database
          if (result.gaps.length > 0) {
            // Clear existing unresolved gaps
            await db
              .delete(sessionGaps)
              .where(
                and(
                  eq(sessionGaps.sessionId, sessionId),
                  eq(sessionGaps.isResolved, false)
                )
              );

            // Insert new gaps
            const gapRecords = result.gaps.map(gap => {
              const linkedSection = sectionContent.find(
                s => s.templateSectionId === gap.sectionId || s.sectionName === gap.sectionName
              );

              return {
                sessionId,
                sectionContentId: linkedSection?.id || null,
                gapDescription: gap.description,
                userPrompt: gap.primaryQuestion,
                userResponse: null,
                isResolved: false,
                priority: gap.priority,
              };
            });

            await db.insert(sessionGaps).values(gapRecords);

            // Update session status to gaps_detected
            await db
              .update(sessions)
              .set({
                status: 'gaps_detected',
                updatedAt: new Date(),
              })
              .where(eq(sessions.id, sessionId));
          }

          return Response.json({
            data: {
              success: true,
              sessionId,
              gaps: result.gaps,
              completenessScore: result.completenessScore,
              sectionScores: result.sectionScores,
              summary: result.summary,
              recommendations: result.recommendations,
              metrics: result.metrics,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
