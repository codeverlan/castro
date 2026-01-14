/**
 * Gaps API Routes
 * Hono router for gap detection management
 */

import { Hono } from 'hono';
import { db } from '~/db';
import {
  sessions,
  sessionSectionContent,
  sessionGaps,
  templateSections,
} from '~/db/schema';
import { gapDetectionEngine } from '~/services/gapDetection';
import { templateSectionToMappingInfo } from '~/services/contentMapping';
import {
  validateAnalyzeGapsRequest,
  validateGetGapsRequest,
} from '~/services/gapDetection/validations';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq, and, asc } from 'drizzle-orm';
import type { MappedSectionContent } from '~/services/contentMapping/types';

export const gapsRouter = new Hono();

/**
 * GET /api/gaps
 * Get gaps for a session
 */
gapsRouter.get('/', async (c) => {
  try {
    const queryParams = {
      sessionId: c.req.query('sessionId') || '',
      includeResolved: c.req.query('includeResolved') === 'true',
      severity: c.req.query('severity') || undefined,
    };

    // Validate query parameters
    const validation = validateGetGapsRequest(queryParams);
    if (!validation.success) {
      return c.json(
        { error: 'Invalid request', details: validation.errors.format() },
        400
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
    const enhancedGaps = gaps.map((gap) => {
      const section = sectionContent.find((s) => s.id === gap.sectionContentId);
      return {
        ...gap,
        sectionName: section?.sectionName || 'Unknown Section',
        sectionContent: section?.rawContent || null,
      };
    });

    // Filter by severity if specified
    const filteredGaps = severity
      ? enhancedGaps.filter((g) =>
          g.gapDescription.toLowerCase().includes(severity.toLowerCase())
        )
      : enhancedGaps;

    // Calculate summary stats
    const summary = {
      total: filteredGaps.length,
      resolved: gaps.filter((g) => g.isResolved).length,
      unresolved: gaps.filter((g) => !g.isResolved).length,
    };

    return c.json({
      data: {
        gaps: filteredGaps,
        summary,
        sessionStatus: session.status,
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
 * POST /api/gaps
 * Analyze a session for gaps
 */
gapsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validation = validateAnalyzeGapsRequest(body);
    if (!validation.success) {
      return c.json(
        { error: 'Invalid request', details: validation.errors.format() },
        400
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
      return c.json(
        { error: 'Session has no mapped content. Run content mapping first.' },
        400
      );
    }

    // Convert to the format expected by gap detection engine
    const mappedSections: MappedSectionContent[] = sectionContent.map((sc) => ({
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
    const templateSectionInfos = session.template.sections.map((s) =>
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
      return c.json(
        { error: 'Gap detection failed', details: result.error },
        500
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
      const gapRecords = result.gaps.map((gap) => {
        const linkedSection = sectionContent.find(
          (s) =>
            s.templateSectionId === gap.sectionId ||
            s.sectionName === gap.sectionName
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

    return c.json({
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
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/gaps/:id
 * Get a specific gap by ID
 */
gapsRouter.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const gap = await db.query.sessionGaps.findFirst({
      where: eq(sessionGaps.id, id),
    });

    if (!gap) {
      throw new NotFoundError(`Gap with ID ${id} not found`);
    }

    return c.json({ data: gap });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * PATCH /api/gaps/:id
 * Update a gap (resolve with user response)
 */
gapsRouter.patch('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const gap = await db.query.sessionGaps.findFirst({
      where: eq(sessionGaps.id, id),
    });

    if (!gap) {
      throw new NotFoundError(`Gap with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.userResponse !== undefined) {
      updateData.userResponse = body.userResponse;
    }

    if (body.isResolved !== undefined) {
      updateData.isResolved = body.isResolved;
      if (body.isResolved) {
        updateData.resolvedAt = new Date();
      }
    }

    const [updatedGap] = await db
      .update(sessionGaps)
      .set(updateData)
      .where(eq(sessionGaps.id, id))
      .returning();

    return c.json({ data: updatedGap });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * POST /api/gaps/batch
 * Batch resolve multiple gaps
 */
gapsRouter.post('/batch', async (c) => {
  try {
    const body = await c.req.json();

    const { gapIds, responses } = body;

    if (!Array.isArray(gapIds) || gapIds.length === 0) {
      return c.json({ error: 'gapIds must be a non-empty array' }, 400);
    }

    const results = [];

    for (let i = 0; i < gapIds.length; i++) {
      const gapId = gapIds[i];
      const response = responses?.[i];

      const [updatedGap] = await db
        .update(sessionGaps)
        .set({
          userResponse: response || null,
          isResolved: true,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(sessionGaps.id, gapId))
        .returning();

      if (updatedGap) {
        results.push(updatedGap);
      }
    }

    return c.json({
      data: {
        resolved: results.length,
        gaps: results,
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
