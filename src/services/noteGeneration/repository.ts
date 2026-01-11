/**
 * Note Generation Repository
 * Database operations for storing and retrieving generated clinical notes
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/connection';
import {
  sessions,
  sessionSectionContent,
  sessionGaps,
  finalNotes,
  noteTemplates,
  templateSections,
  auditLogs,
  processingMetrics,
} from '../../db/schema';
import type {
  Session,
  SessionSectionContent,
  SessionGap,
  FinalNote,
  NewFinalNote,
  NoteTemplate,
  TemplateSection,
} from '../../db/schema';
import type {
  SectionContent,
  ResolvedGap,
  SessionData,
  TemplateType,
  NoteFormat,
} from './types';

export class NoteGenerationRepository {
  /**
   * Get complete session data for note generation
   */
  async getSessionDataForGeneration(sessionId: string): Promise<SessionData | null> {
    // Get session with template
    const [session] = await db
      .select({
        session: sessions,
        template: noteTemplates,
      })
      .from(sessions)
      .innerJoin(noteTemplates, eq(sessions.templateId, noteTemplates.id))
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return null;
    }

    // Get template sections
    const templateSectionsList = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, session.template.id))
      .orderBy(templateSections.displayOrder);

    // Get session section content
    const sectionContent = await db
      .select()
      .from(sessionSectionContent)
      .where(eq(sessionSectionContent.sessionId, sessionId))
      .orderBy(sessionSectionContent.displayOrder);

    // Get resolved gaps
    const gaps = await db
      .select()
      .from(sessionGaps)
      .where(
        and(
          eq(sessionGaps.sessionId, sessionId),
          eq(sessionGaps.isResolved, true)
        )
      )
      .orderBy(sessionGaps.priority);

    // Transform section content
    const sections: SectionContent[] = sectionContent.map((sc) => ({
      sectionId: sc.id,
      sectionName: sc.sectionName,
      rawContent: sc.rawContent,
      processedContent: sc.processedContent,
      userProvidedContent: sc.userProvidedContent,
      finalContent: sc.finalContent,
      confidenceScore: sc.confidenceScore,
      displayOrder: sc.displayOrder,
    }));

    // Transform resolved gaps
    const resolvedGaps: ResolvedGap[] = gaps
      .filter((g) => g.userResponse)
      .map((g) => {
        const relatedSection = sectionContent.find(
          (sc) => sc.id === g.sectionContentId
        );
        return {
          gapId: g.id,
          sectionName: relatedSection?.sectionName || 'General',
          gapDescription: g.gapDescription,
          userResponse: g.userResponse!,
        };
      });

    return {
      sessionId: session.session.id,
      templateId: session.template.id,
      templateName: session.template.name,
      templateType: session.template.templateType as TemplateType,
      sections,
      resolvedGaps,
      metadata: session.session.metadata as Record<string, unknown> | undefined,
    };
  }

  /**
   * Get existing final note for a session
   */
  async getFinalNote(sessionId: string): Promise<FinalNote | null> {
    const [note] = await db
      .select()
      .from(finalNotes)
      .where(eq(finalNotes.sessionId, sessionId))
      .limit(1);

    return note || null;
  }

  /**
   * Get final note by ID
   */
  async getFinalNoteById(noteId: string): Promise<FinalNote | null> {
    const [note] = await db
      .select()
      .from(finalNotes)
      .where(eq(finalNotes.id, noteId))
      .limit(1);

    return note || null;
  }

  /**
   * Store generated note
   */
  async storeGeneratedNote(
    sessionId: string,
    noteContent: string,
    plainTextContent: string,
    format: NoteFormat,
    wordCount: number,
    characterCount: number
  ): Promise<{ success: boolean; noteId?: string; error?: string }> {
    try {
      return await db.transaction(async (tx) => {
        // Check if note already exists
        const [existingNote] = await tx
          .select()
          .from(finalNotes)
          .where(eq(finalNotes.sessionId, sessionId))
          .limit(1);

        let noteId: string;

        if (existingNote) {
          // Update existing note
          await tx
            .update(finalNotes)
            .set({
              noteContent,
              plainTextContent,
              format,
              wordCount,
              characterCount,
              updatedAt: new Date(),
            })
            .where(eq(finalNotes.id, existingNote.id));
          noteId = existingNote.id;
        } else {
          // Insert new note
          const newNote: NewFinalNote = {
            sessionId,
            noteContent,
            plainTextContent,
            format,
            wordCount,
            characterCount,
          };
          const [inserted] = await tx
            .insert(finalNotes)
            .values(newNote)
            .returning({ id: finalNotes.id });
          noteId = inserted.id;
        }

        // Update session status to completed
        await tx
          .update(sessions)
          .set({
            status: 'completed',
            processingCompletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));

        // Create audit log entry
        await tx.insert(auditLogs).values({
          action: 'note_generated',
          severity: 'info',
          actorType: 'system',
          actorId: 'note_generation_service',
          resourceType: 'final_note',
          resourceId: noteId,
          sessionId,
          description: `Clinical note generated (${wordCount} words, ${format} format)`,
          metadata: {
            wordCount,
            characterCount,
            format,
            isUpdate: !!existingNote,
          },
        });

        return { success: true, noteId };
      });
    } catch (error) {
      console.error('Failed to store generated note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(
    noteId: string,
    updates: {
      noteContent?: string;
      plainTextContent?: string;
      format?: NoteFormat;
      wordCount?: number;
      characterCount?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .update(finalNotes)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(finalNotes.id, noteId));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Mark note as exported
   */
  async markNoteExported(noteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db
        .update(finalNotes)
        .set({
          wasExported: true,
          exportedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(finalNotes.id, noteId));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export update failed',
      };
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    return session || null;
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<NoteTemplate | null> {
    const [template] = await db
      .select()
      .from(noteTemplates)
      .where(eq(noteTemplates.id, templateId))
      .limit(1);

    return template || null;
  }

  /**
   * Get template sections
   */
  async getTemplateSections(templateId: string): Promise<TemplateSection[]> {
    return await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, templateId))
      .orderBy(templateSections.displayOrder);
  }

  /**
   * Store processing metrics for note generation
   */
  async storeMetrics(
    sessionId: string,
    metrics: {
      totalProcessingTimeMs: number;
      llmProcessingTimeMs: number;
      modelUsed: string;
      sectionsProcessed: number;
      gapsIncorporated: number;
    }
  ): Promise<void> {
    try {
      await db.insert(processingMetrics).values([
        {
          sessionId,
          metricType: 'note_generation_duration',
          component: 'note_generation_service',
          value: metrics.totalProcessingTimeMs,
          unit: 'milliseconds',
          labels: {
            model: metrics.modelUsed,
            sectionsProcessed: metrics.sectionsProcessed,
            gapsIncorporated: metrics.gapsIncorporated,
            llmProcessingTimeMs: metrics.llmProcessingTimeMs,
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to store metrics:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'completing' | 'completed' | 'failed',
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
   * Check if session is ready for note generation
   */
  async isSessionReadyForGeneration(sessionId: string): Promise<{
    ready: boolean;
    reason?: string;
  }> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return { ready: false, reason: 'Session not found' };
    }

    // Check if in valid status for generation
    const validStatuses = ['gaps_detected', 'completing', 'completed'];
    if (!validStatuses.includes(session.status)) {
      return {
        ready: false,
        reason: `Session is in '${session.status}' status, not ready for note generation`,
      };
    }

    // Check for unresolved gaps
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

    if (unresolvedGaps.length > 0 && session.status === 'gaps_detected') {
      return { ready: false, reason: 'Session has unresolved gaps' };
    }

    // Check if section content exists
    const sectionContent = await db
      .select()
      .from(sessionSectionContent)
      .where(eq(sessionSectionContent.sessionId, sessionId))
      .limit(1);

    if (sectionContent.length === 0) {
      return { ready: false, reason: 'No content has been mapped for this session' };
    }

    return { ready: true };
  }

  /**
   * Get note generation history for a session
   */
  async getNoteGenerationHistory(sessionId: string): Promise<Array<{
    action: string;
    timestamp: Date;
    metadata: unknown;
  }>> {
    const logs = await db
      .select({
        action: auditLogs.action,
        timestamp: auditLogs.createdAt,
        metadata: auditLogs.metadata,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.sessionId, sessionId),
          eq(auditLogs.action, 'note_generated')
        )
      )
      .orderBy(desc(auditLogs.createdAt));

    return logs.map((log) => ({
      action: log.action,
      timestamp: log.timestamp,
      metadata: log.metadata,
    }));
  }
}

// Default singleton instance
export const noteGenerationRepository = new NoteGenerationRepository();
