/**
 * Note Generation Service
 * Transforms raw dictation and filled gaps into professionally worded clinical documentation
 * Uses local LLM (Ollama) for text generation
 */

import { OllamaService, ollamaService } from '../ollama/service';
import { ollamaConfig } from '../ollama/config';
import { NoteGenerationRepository, noteGenerationRepository } from './repository';
import { noteGenerationPrompts, buildNotePrompt } from './prompts';
import {
  validateGenerateNoteRequest,
  validateRefineNoteRequest,
  validateLLMNoteResponse,
  validateLLMRefineResponse,
} from './validations';
import {
  NoteGenerationError,
  SessionNotFoundError,
  InsufficientContentError,
  LLMProcessingError,
  LLMResponseParseError,
  NoteNotFoundError,
  NoteValidationError,
  isNoteGenerationError,
} from './errors';
import type {
  GenerateNoteRequest,
  GenerateNoteResult,
  RefineNoteRequest,
  RefineNoteResult,
  FormatNoteRequest,
  FormatNoteResult,
  NoteGenerationOptions,
  ProcessedSection,
  ClinicalTone,
  NoteFormat,
  TemplateType,
  NoteGenerationMetrics,
  SessionData,
  ClinicalContext,
} from './types';
import type { OllamaModel, OllamaRequestOptions } from '../ollama/types';

export class NoteGenerationService {
  private ollamaService: OllamaService;
  private repository: NoteGenerationRepository;
  private defaultModel: OllamaModel;

  constructor(
    ollama?: OllamaService,
    repository?: NoteGenerationRepository,
    defaultModel?: OllamaModel
  ) {
    this.ollamaService = ollama || ollamaService;
    this.repository = repository || noteGenerationRepository;
    this.defaultModel = defaultModel || ollamaConfig.defaultModel;
  }

  /**
   * Generate a complete clinical note from session data
   */
  async generateNote(
    request: GenerateNoteRequest,
    options?: NoteGenerationOptions
  ): Promise<GenerateNoteResult> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      // Validate request
      const validation = validateGenerateNoteRequest(request);
      if (!validation.success) {
        throw new NoteValidationError(
          'Invalid request',
          undefined,
          validation.errors.issues.map((e: { message: string }) => e.message)
        );
      }

      // Check if session is ready for note generation
      const readyCheck = await this.repository.isSessionReadyForGeneration(request.sessionId);
      if (!readyCheck.ready) {
        throw new InsufficientContentError(request.sessionId, [readyCheck.reason || 'Unknown']);
      }

      // Get session data
      const sessionData = await this.repository.getSessionDataForGeneration(request.sessionId);
      if (!sessionData) {
        throw new SessionNotFoundError(request.sessionId);
      }

      // Update session status to completing
      await this.repository.updateSessionStatus(request.sessionId, 'completing');

      // Prepare sections for LLM
      const processedSections = this.prepareSessionSections(sessionData);

      if (processedSections.length === 0) {
        throw new InsufficientContentError(request.sessionId, ['No sections with content']);
      }

      // Generate the note using LLM
      const llmStartTime = Date.now();
      const llmResult = await this.generateNoteWithLLM(
        processedSections,
        sessionData.resolvedGaps,
        request.templateType || sessionData.templateType,
        request.targetTone || 'clinical',
        request.customInstructions,
        sessionData.clinicalContext as ClinicalContext | undefined,
        { model, ...options }
      );
      const llmProcessingTime = Date.now() - llmStartTime;

      if (!llmResult.success) {
        throw new LLMProcessingError('note generation', llmResult.error);
      }

      // Format the note
      const formattedContent = this.formatNoteContent(
        llmResult.fullContent!,
        request.format || 'markdown'
      );

      const plainTextContent = this.convertToPlainText(llmResult.fullContent!);
      const wordCount = this.countWords(plainTextContent);
      const characterCount = plainTextContent.length;

      // Store the generated note
      const storeResult = await this.repository.storeGeneratedNote(
        request.sessionId,
        formattedContent,
        plainTextContent,
        request.format || 'markdown',
        wordCount,
        characterCount
      );

      if (!storeResult.success) {
        throw new NoteGenerationError(
          'Failed to store generated note',
          'DATABASE_ERROR',
          500,
          true
        );
      }

      // Store metrics
      const totalProcessingTime = Date.now() - startTime;
      await this.repository.storeMetrics(request.sessionId, {
        totalProcessingTimeMs: totalProcessingTime,
        llmProcessingTimeMs: llmProcessingTime,
        modelUsed: model,
        sectionsProcessed: processedSections.length,
        gapsIncorporated: sessionData.resolvedGaps.length,
      });

      return {
        success: true,
        noteId: storeResult.noteId,
        sessionId: request.sessionId,
        noteContent: formattedContent,
        plainTextContent,
        format: request.format || 'markdown',
        wordCount,
        characterCount,
        sectionsIncluded: llmResult.sectionsIncluded,
        processingTimeMs: totalProcessingTime,
        modelUsed: model,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Update session status to failed if it's a critical error
      if (isNoteGenerationError(error) && !error.retryable) {
        await this.repository.updateSessionStatus(
          request.sessionId,
          'failed',
          error.message
        );
      }

      if (isNoteGenerationError(error)) {
        return {
          success: false,
          sessionId: request.sessionId,
          processingTimeMs: processingTime,
          modelUsed: model,
          error: error.message,
        };
      }

      return {
        success: false,
        sessionId: request.sessionId,
        processingTimeMs: processingTime,
        modelUsed: model,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refine an existing note with specific instructions
   */
  async refineNote(
    request: RefineNoteRequest,
    options?: NoteGenerationOptions
  ): Promise<RefineNoteResult> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      // Validate request
      const validation = validateRefineNoteRequest(request);
      if (!validation.success) {
        throw new NoteValidationError(
          'Invalid refinement request',
          undefined,
          validation.errors.issues.map((e: { message: string }) => e.message)
        );
      }

      // Get the existing note
      const existingNote = await this.repository.getFinalNoteById(request.noteId);
      if (!existingNote) {
        throw new NoteNotFoundError(request.noteId);
      }

      // Generate refined content using LLM
      const llmStartTime = Date.now();
      const llmResult = await this.refineNoteWithLLM(
        existingNote.noteContent,
        request.instructions,
        request.preserveSections || [],
        request.targetTone || 'clinical',
        { model, ...options }
      );
      const llmProcessingTime = Date.now() - llmStartTime;

      if (!llmResult.success) {
        throw new LLMProcessingError('note refinement', llmResult.error);
      }

      const plainTextContent = this.convertToPlainText(llmResult.refinedContent!);
      const wordCount = this.countWords(plainTextContent);
      const characterCount = plainTextContent.length;

      // Update the note
      await this.repository.updateNote(request.noteId, {
        noteContent: llmResult.refinedContent,
        plainTextContent,
        wordCount,
        characterCount,
      });

      return {
        success: true,
        noteId: request.noteId,
        refinedContent: llmResult.refinedContent,
        plainTextContent,
        changesApplied: llmResult.changesApplied,
        wordCount,
        characterCount,
        processingTimeMs: Date.now() - startTime,
        modelUsed: model,
      };
    } catch (error) {
      if (isNoteGenerationError(error)) {
        return {
          success: false,
          noteId: request.noteId,
          processingTimeMs: Date.now() - startTime,
          modelUsed: model,
          error: error.message,
        };
      }

      return {
        success: false,
        noteId: request.noteId,
        processingTimeMs: Date.now() - startTime,
        modelUsed: model,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Format a note for export in different formats
   */
  async formatNote(request: FormatNoteRequest): Promise<FormatNoteResult> {
    try {
      const existingNote = await this.repository.getFinalNoteById(request.noteId);
      if (!existingNote) {
        throw new NoteNotFoundError(request.noteId);
      }

      let formattedContent = existingNote.noteContent;

      // Convert format if needed
      if (request.targetFormat !== existingNote.format) {
        formattedContent = this.convertFormat(
          existingNote.noteContent,
          existingNote.format as NoteFormat,
          request.targetFormat
        );
      }

      // Add metadata if requested
      if (request.includeMetadata || request.includeTimestamp) {
        const metadata = this.buildMetadataHeader(
          request.includeMetadata,
          request.includeTimestamp,
          existingNote.createdAt
        );
        formattedContent = metadata + formattedContent;
      }

      // Mark as exported
      await this.repository.markNoteExported(request.noteId);

      return {
        success: true,
        formattedContent,
        format: request.targetFormat,
      };
    } catch (error) {
      if (isNoteGenerationError(error)) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get an existing note by session ID
   */
  async getNoteBySessionId(sessionId: string): Promise<GenerateNoteResult | null> {
    const note = await this.repository.getFinalNote(sessionId);
    if (!note) {
      return null;
    }

    return {
      success: true,
      noteId: note.id,
      sessionId: note.sessionId,
      noteContent: note.noteContent,
      plainTextContent: note.plainTextContent,
      format: note.format as NoteFormat,
      wordCount: note.wordCount || undefined,
      characterCount: note.characterCount || undefined,
      processingTimeMs: 0,
    };
  }

  // Private helper methods

  /**
   * Prepare session sections for LLM processing
   */
  private prepareSessionSections(sessionData: SessionData): ProcessedSection[] {
    return sessionData.sections
      .filter((s) => s.finalContent || s.processedContent || s.rawContent)
      .map((s) => ({
        name: s.sectionName,
        content: s.finalContent || s.processedContent || s.rawContent || '',
        displayOrder: s.displayOrder,
        confidence: s.confidenceScore || 70,
        hasUserInput: !!s.userProvidedContent,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Generate note content using LLM
   */
  private async generateNoteWithLLM(
    sections: ProcessedSection[],
    resolvedGaps: { gapId: string; sectionName: string; gapDescription: string; userResponse: string }[],
    templateType: TemplateType,
    targetTone: ClinicalTone,
    customInstructions?: string,
    clinicalContext?: ClinicalContext,
    options?: OllamaRequestOptions
  ): Promise<{
    success: boolean;
    fullContent?: string;
    sectionsIncluded?: string[];
    error?: string;
  }> {
    const prompt = noteGenerationPrompts.generateCompleteNotePrompt(
      sections,
      resolvedGaps,
      templateType,
      targetTone,
      clinicalContext,
      customInstructions
    );

    const { system, user } = buildNotePrompt(prompt);

    const response = await this.ollamaService.generate(user, system, {
      ...options,
      temperature: options?.temperature || 0.3,
    });

    if (!response.success) {
      return { success: false, error: response.error };
    }

    // Parse the LLM response
    try {
      const parsed = this.parseJSONResponse<{
        note: {
          sections: Array<{ name: string; content: string; displayOrder: number }>;
          fullContent: string;
        };
        metadata: {
          wordCount: number;
          sectionsIncluded: string[];
          gapsIntegrated: number;
          reviewFlagsCount: number;
          clinicalTermsUsed: string[];
        };
      }>(response.data!);

      return {
        success: true,
        fullContent: parsed.note.fullContent,
        sectionsIncluded: parsed.metadata.sectionsIncluded,
      };
    } catch {
      // If JSON parsing fails, use the raw response as content
      return {
        success: true,
        fullContent: response.data!,
        sectionsIncluded: sections.map((s) => s.name),
      };
    }
  }

  /**
   * Refine note content using LLM
   */
  private async refineNoteWithLLM(
    currentContent: string,
    instructions: string,
    preserveSections: string[],
    targetTone: ClinicalTone,
    options?: OllamaRequestOptions
  ): Promise<{
    success: boolean;
    refinedContent?: string;
    changesApplied?: string[];
    error?: string;
  }> {
    const prompt = noteGenerationPrompts.generateRefinePrompt(
      currentContent,
      instructions,
      preserveSections,
      targetTone
    );

    const { system, user } = buildNotePrompt(prompt);

    const response = await this.ollamaService.generate(user, system, {
      ...options,
      temperature: options?.temperature || 0.3,
    });

    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const parsed = this.parseJSONResponse<{
        refinedNote: {
          fullContent: string;
          sections: Array<{ name: string; content: string; wasModified: boolean }>;
        };
        changes: {
          changesApplied: string[];
          sectionsModified: string[];
          wordCount: number;
        };
      }>(response.data!);

      return {
        success: true,
        refinedContent: parsed.refinedNote.fullContent,
        changesApplied: parsed.changes.changesApplied,
      };
    } catch {
      // If JSON parsing fails, use the raw response as content
      return {
        success: true,
        refinedContent: response.data!,
        changesApplied: ['Content refined'],
      };
    }
  }

  /**
   * Parse JSON from LLM response
   */
  private parseJSONResponse<T>(response: string): T {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch?.[1]?.trim() || response.trim();

    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      // Try to find JSON object in the response
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]) as T;
      }
      throw new LLMResponseParseError('Failed to parse JSON response', response.substring(0, 500));
    }
  }

  /**
   * Format note content based on target format
   */
  private formatNoteContent(content: string, format: NoteFormat): string {
    switch (format) {
      case 'html':
        return this.convertMarkdownToHtml(content);
      case 'plain':
        return this.convertToPlainText(content);
      case 'markdown':
      default:
        return content;
    }
  }

  /**
   * Convert between note formats
   */
  private convertFormat(content: string, from: NoteFormat, to: NoteFormat): string {
    // First convert to markdown (our intermediate format)
    let markdown = content;
    if (from === 'html') {
      markdown = this.convertHtmlToMarkdown(content);
    } else if (from === 'plain') {
      // Plain text doesn't need conversion to markdown
      markdown = content;
    }

    // Then convert to target format
    switch (to) {
      case 'html':
        return this.convertMarkdownToHtml(markdown);
      case 'plain':
        return this.convertToPlainText(markdown);
      case 'markdown':
      default:
        return markdown;
    }
  }

  /**
   * Convert markdown to plain text
   */
  private convertToPlainText(markdown: string): string {
    return markdown
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^[-*+]\s+/gm, '• ') // Convert list markers
      .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }

  /**
   * Convert markdown to HTML
   */
  private convertMarkdownToHtml(markdown: string): string {
    let html = markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');

    // Wrap in paragraph tags
    html = `<p>${html}</p>`;

    // Clean up list items
    html = html.replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');

    return html;
  }

  /**
   * Convert HTML to markdown (basic)
   */
  private convertHtmlToMarkdown(html: string): string {
    return html
      .replace(/<h1>([^<]+)<\/h1>/g, '# $1\n')
      .replace(/<h2>([^<]+)<\/h2>/g, '## $1\n')
      .replace(/<h3>([^<]+)<\/h3>/g, '### $1\n')
      .replace(/<strong>([^<]+)<\/strong>/g, '**$1**')
      .replace(/<em>([^<]+)<\/em>/g, '*$1*')
      .replace(/<code>([^<]+)<\/code>/g, '`$1`')
      .replace(/<li>([^<]+)<\/li>/g, '- $1\n')
      .replace(/<[^>]+>/g, '') // Remove remaining tags
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Build metadata header for export
   */
  private buildMetadataHeader(
    includeMetadata?: boolean,
    includeTimestamp?: boolean,
    createdAt?: Date
  ): string {
    const parts: string[] = [];

    if (includeTimestamp && createdAt) {
      parts.push(`Generated: ${createdAt.toLocaleString()}`);
    }

    if (includeMetadata) {
      parts.push('Clinical Documentation Note');
      parts.push('Generated by Castro Documentation System');
    }

    if (parts.length === 0) {
      return '';
    }

    return parts.join('\n') + '\n---\n\n';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }
}

// Default singleton instance
export const noteGenerationService = new NoteGenerationService();
