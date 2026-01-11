/**
 * Content Mapping Repository
 * Database operations for storing and retrieving content mapping results
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/connection';
import {
  sessions,
  sessionSectionContent,
  sessionGaps,
  auditLogs,
  processingMetrics,
} from '../../db/schema';
import type {
  Session,
  SessionSectionContent,
  NewSessionSectionContent,
  SessionGap,
  NewSessionGap,
} from '../../db/schema';
import type {
  ContentMappingEngineResult,
  MappedSectionContent,
  DocumentationGap,
  MappingMetrics,
} from './types';

export class ContentMappingRepository {
  /**
   * Store complete mapping results for a session
   */
  async storeMappingResults(
    sessionId: string,
    result: ContentMappingEngineResult
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use a transaction to ensure consistency
      await db.transaction(async (tx) => {
        // Update session status to 'mapping' complete
        const newStatus = result.gaps.length > 0 ? 'gaps_detected' : 'completing';

        await tx
          .update(sessions)
          .set({
            status: newStatus,
            processingCompletedAt: result.success ? new Date() : undefined,
            errorMessage: result.error || null,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));

        // Delete existing section content for this session (if re-processing)
        await tx
          .delete(sessionSectionContent)
          .where(eq(sessionSectionContent.sessionId, sessionId));

        // Insert mapped section content
        if (result.mappedSections.length > 0) {
          const sectionContentRecords: NewSessionSectionContent[] = result.mappedSections.map(
            (section) => ({
              sessionId,
              sectionName: section.sectionName,
              templateSectionId: section.sectionId,
              rawContent: section.rawContent || null,
              processedContent: section.processedContent || null,
              userProvidedContent: null,
              finalContent: section.processedContent || section.rawContent || null,
              confidenceScore: section.confidence,
              needsReview: section.needsReview,
              displayOrder: section.displayOrder,
            })
          );

          await tx.insert(sessionSectionContent).values(sectionContentRecords);
        }

        // Delete existing gaps for this session (if re-processing)
        await tx
          .delete(sessionGaps)
          .where(eq(sessionGaps.sessionId, sessionId));

        // Insert gaps
        if (result.gaps.length > 0) {
          // Get the section content IDs for linking gaps
          const insertedSections = await tx
            .select()
            .from(sessionSectionContent)
            .where(eq(sessionSectionContent.sessionId, sessionId));

          const gapRecords: NewSessionGap[] = result.gaps.map((gap) => {
            const linkedSection = insertedSections.find(
              (s) => s.templateSectionId === gap.sectionId
            );

            return {
              sessionId,
              sectionContentId: linkedSection?.id || null,
              gapDescription: gap.description,
              userPrompt: gap.suggestedQuestions[0] || gap.description,
              userResponse: null,
              isResolved: false,
              priority: gap.priority,
            };
          });

          await tx.insert(sessionGaps).values(gapRecords);
        }

        // Store processing metrics
        await tx.insert(processingMetrics).values([
          {
            sessionId,
            metricType: 'content_mapping_duration',
            component: 'content_mapping_engine',
            value: result.metrics.totalProcessingTimeMs,
            unit: 'milliseconds',
            labels: {
              model: result.metrics.modelUsed,
              llmCallCount: result.metrics.llmCallCount,
              success: result.success,
            },
          },
        ]);

        // Create audit log entry
        await tx.insert(auditLogs).values({
          action: 'content_mapped',
          severity: result.success ? 'info' : 'warning',
          actorType: 'system',
          actorId: 'content_mapping_engine',
          resourceType: 'session',
          resourceId: sessionId,
          sessionId,
          description: result.success
            ? `Content mapped to ${result.mappedSections.length} sections with ${result.gaps.length} gaps identified`
            : `Content mapping failed: ${result.error}`,
          metadata: {
            completenessScore: result.completenessScore,
            sectionsProcessed: result.mappedSections.length,
            gapsIdentified: result.gaps.length,
            processingTimeMs: result.metrics.totalProcessingTimeMs,
          },
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to store mapping results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * Get session with its mapping results
   */
  async getSessionWithMappings(sessionId: string): Promise<{
    session: Session | null;
    sectionContent: SessionSectionContent[];
    gaps: SessionGap[];
  }> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return { session: null, sectionContent: [], gaps: [] };
    }

    const sectionContent = await db
      .select()
      .from(sessionSectionContent)
      .where(eq(sessionSectionContent.sessionId, sessionId))
      .orderBy(sessionSectionContent.displayOrder);

    const gaps = await db
      .select()
      .from(sessionGaps)
      .where(eq(sessionGaps.sessionId, sessionId))
      .orderBy(sessionGaps.priority);

    return { session, sectionContent, gaps };
  }

  /**
   * Update a specific section's content
   */
  async updateSectionContent(
    sectionContentId: string,
    updates: {
      processedContent?: string;
      userProvidedContent?: string;
      finalContent?: string;
      needsReview?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .update(sessionSectionContent)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(sessionSectionContent.id, sectionContentId));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Resolve a gap with user response
   */
  async resolveGap(
    gapId: string,
    userResponse: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .update(sessionGaps)
        .set({
          userResponse,
          isResolved: true,
          resolvedAt: new Date(),
        })
        .where(eq(sessionGaps.id, gapId));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve gap',
      };
    }
  }

  /**
   * Check if all gaps are resolved for a session
   */
  async areAllGapsResolved(sessionId: string): Promise<boolean> {
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

    return unresolvedGaps.length === 0;
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'pending' | 'transcribing' | 'transcribed' | 'mapping' | 'gaps_detected' | 'completing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .update(sessions)
        .set({
          status,
          errorMessage: errorMessage || null,
          updatedAt: new Date(),
          ...(status === 'completed' ? { processingCompletedAt: new Date() } : {}),
        })
        .where(eq(sessions.id, sessionId));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status update failed',
      };
    }
  }

  /**
   * Get sections needing review for a session
   */
  async getSectionsNeedingReview(sessionId: string): Promise<SessionSectionContent[]> {
    return await db
      .select()
      .from(sessionSectionContent)
      .where(
        and(
          eq(sessionSectionContent.sessionId, sessionId),
          eq(sessionSectionContent.needsReview, true)
        )
      )
      .orderBy(sessionSectionContent.displayOrder);
  }

  /**
   * Get processing metrics for a session
   */
  async getProcessingMetrics(sessionId: string): Promise<Array<{
    metricType: string;
    component: string;
    value: number;
    unit: string;
    labels: unknown;
    recordedAt: Date;
  }>> {
    const metrics = await db
      .select()
      .from(processingMetrics)
      .where(eq(processingMetrics.sessionId, sessionId))
      .orderBy(desc(processingMetrics.recordedAt));

    return metrics.map(m => ({
      metricType: m.metricType,
      component: m.component,
      value: m.value,
      unit: m.unit,
      labels: m.labels,
      recordedAt: m.recordedAt,
    }));
  }
}

// Default singleton instance
export const contentMappingRepository = new ContentMappingRepository();
