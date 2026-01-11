/**
 * Note Generation Service Types
 * Type definitions for clinical note generation operations
 */

import type { OllamaModel } from '../ollama/types';

/**
 * Target tone for clinical documentation
 */
export type ClinicalTone = 'clinical' | 'formal' | 'compassionate';

/**
 * Note format options
 */
export type NoteFormat = 'plain' | 'markdown' | 'html';

/**
 * Template type for note generation
 */
export type TemplateType = 'SOAP' | 'DAP' | 'BIRP' | 'custom';

/**
 * Section content for note generation
 */
export interface SectionContent {
  sectionId: string;
  sectionName: string;
  rawContent: string | null;
  processedContent: string | null;
  userProvidedContent: string | null;
  finalContent: string | null;
  confidenceScore: number | null;
  displayOrder: number;
}

/**
 * Resolved gap information
 */
export interface ResolvedGap {
  gapId: string;
  sectionName: string;
  gapDescription: string;
  userResponse: string;
}

/**
 * Clinical context for note generation
 */
export interface ClinicalContext {
  presentingIssues?: string[];
  symptoms?: string[];
  interventions?: string[];
  goals?: string[];
  riskFactors?: string[];
  strengths?: string[];
  emotionalThemes?: string[];
  clientQuotes?: string[];
  sessionDynamics?: string;
  homework?: string[];
}

/**
 * Request to generate a clinical note
 */
export interface GenerateNoteRequest {
  sessionId: string;
  templateId: string;
  templateType?: TemplateType;
  targetTone?: ClinicalTone;
  includeGapsSummary?: boolean;
  includeClinicalContext?: boolean;
  format?: NoteFormat;
  customInstructions?: string;
}

/**
 * Result from note generation
 */
export interface GenerateNoteResult {
  success: boolean;
  noteId?: string;
  sessionId?: string;
  noteContent?: string;
  plainTextContent?: string;
  format?: NoteFormat;
  wordCount?: number;
  characterCount?: number;
  sectionsIncluded?: string[];
  processingTimeMs: number;
  modelUsed?: string;
  error?: string;
}

/**
 * Request to refine an existing note
 */
export interface RefineNoteRequest {
  noteId: string;
  sessionId: string;
  instructions: string;
  preserveSections?: string[];
  targetTone?: ClinicalTone;
}

/**
 * Result from note refinement
 */
export interface RefineNoteResult {
  success: boolean;
  noteId?: string;
  refinedContent?: string;
  plainTextContent?: string;
  changesApplied?: string[];
  wordCount?: number;
  characterCount?: number;
  processingTimeMs: number;
  modelUsed?: string;
  error?: string;
}

/**
 * Request to format note for export
 */
export interface FormatNoteRequest {
  noteId: string;
  targetFormat: NoteFormat;
  includeMetadata?: boolean;
  includeTimestamp?: boolean;
}

/**
 * Result from note formatting
 */
export interface FormatNoteResult {
  success: boolean;
  formattedContent?: string;
  format?: NoteFormat;
  error?: string;
}

/**
 * Internal section data for LLM processing
 */
export interface ProcessedSection {
  name: string;
  content: string;
  displayOrder: number;
  confidence: number;
  hasUserInput: boolean;
}

/**
 * LLM generation options for note generation
 */
export interface NoteGenerationOptions {
  model?: OllamaModel;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Metrics for note generation
 */
export interface NoteGenerationMetrics {
  totalProcessingTimeMs: number;
  llmProcessingTimeMs: number;
  databaseTimeMs: number;
  modelUsed: string;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
  sectionsProcessed: number;
  gapsIncorporated: number;
}

/**
 * Service response wrapper
 */
export interface NoteGenerationServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number;
  model?: string;
}

/**
 * Template section info for note generation
 */
export interface TemplateSection {
  id: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isRequired: boolean;
  minLength?: number | null;
  maxLength?: number | null;
  aiPromptHints?: string | null;
}

/**
 * Complete session data for note generation
 */
export interface SessionData {
  sessionId: string;
  templateId: string;
  templateName: string;
  templateType: TemplateType;
  sections: SectionContent[];
  resolvedGaps: ResolvedGap[];
  clinicalContext?: ClinicalContext;
  metadata?: Record<string, unknown>;
}
