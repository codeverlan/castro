/**
 * Content Mapping Engine Types
 * Type definitions for the content mapping service
 */

import type { TemplateSection } from '../../db/schema';

// Severity levels for gaps and review needs
export type GapSeverity = 'critical' | 'important' | 'minor';

// Clinical context extracted from transcription
export interface ClinicalContext {
  // Primary presenting issues
  presentingIssues: string[];
  // Identified symptoms
  symptoms: string[];
  // Treatment interventions discussed
  interventions: string[];
  // Goals or objectives mentioned
  goals: string[];
  // Risk factors if any
  riskFactors: string[];
  // Strengths identified
  strengths: string[];
  // Detected emotional themes
  emotionalThemes: string[];
  // Key quotes from client
  clientQuotes: string[];
  // Session dynamics
  sessionDynamics?: string;
  // Homework or between-session tasks
  homework?: string[];
}

// Template section info for mapping
export interface MappingSectionInfo {
  id: string;
  name: string;
  description: string | null;
  aiPromptHints: string | null;
  isRequired: boolean;
  displayOrder: number;
  minLength: number | null;
  maxLength: number | null;
}

// Content mapping request for the engine
export interface ContentMappingEngineRequest {
  // Session ID for tracking
  sessionId: string;
  // Full transcription text
  transcription: string;
  // Template sections to map to
  sections: MappingSectionInfo[];
  // Optional patient/client context
  patientContext?: string;
  // Optional session metadata
  sessionMetadata?: {
    sessionDate?: string;
    sessionNumber?: number;
    sessionType?: string;
    duration?: number;
  };
}

// Mapped content for a single section
export interface MappedSectionContent {
  // Section identifier
  sectionId: string;
  // Section name
  sectionName: string;
  // Raw extracted content from transcription
  rawContent: string;
  // Professionally processed content
  processedContent: string;
  // Confidence score (0-100)
  confidence: number;
  // Extracted clinical keywords/terms
  extractedKeywords: string[];
  // Whether this section needs manual review
  needsReview: boolean;
  // Review reason if applicable
  reviewReason?: string;
  // Suggested edits
  suggestedEdits?: string[];
  // Display order
  displayOrder: number;
}

// Identified documentation gap
export interface DocumentationGap {
  // Section ID where gap exists
  sectionId: string;
  // Section name
  sectionName: string;
  // Description of what's missing
  description: string;
  // Missing elements
  missingElements: string[];
  // Severity of the gap
  severity: GapSeverity;
  // Suggested questions to fill the gap
  suggestedQuestions: string[];
  // Priority for user prompting
  priority: number;
}

// Full mapping result from the engine
export interface ContentMappingEngineResult {
  // Whether the mapping was successful
  success: boolean;
  // Session ID
  sessionId: string;
  // Mapped content for each section
  mappedSections: MappedSectionContent[];
  // Extracted clinical context
  clinicalContext: ClinicalContext;
  // Identified gaps
  gaps: DocumentationGap[];
  // Overall completeness score (0-100)
  completenessScore: number;
  // Any content that didn't map to sections
  unmappedContent?: string;
  // Recommendations for completing documentation
  recommendations: string[];
  // Processing metrics
  metrics: MappingMetrics;
  // Error message if failed
  error?: string;
}

// Processing metrics for audit and monitoring
export interface MappingMetrics {
  // Total processing time in ms
  totalProcessingTimeMs: number;
  // Time for initial content extraction
  extractionTimeMs: number;
  // Time for professional rewriting
  rewriteTimeMs: number;
  // Time for gap analysis
  gapAnalysisTimeMs: number;
  // LLM model used
  modelUsed: string;
  // Number of LLM calls made
  llmCallCount: number;
  // Token usage estimate
  estimatedTokens?: number;
}

// Configuration options for the engine
export interface ContentMappingEngineOptions {
  // Model to use for mapping
  model?: string;
  // Temperature for LLM
  temperature?: number;
  // Whether to run professional rewriting
  enableRewriting?: boolean;
  // Whether to run gap analysis
  enableGapAnalysis?: boolean;
  // Minimum confidence threshold for auto-approval
  confidenceThreshold?: number;
  // Maximum retries for failed operations
  maxRetries?: number;
}

// Database storage request
export interface StoreMappingRequest {
  sessionId: string;
  mappedSections: MappedSectionContent[];
  gaps: DocumentationGap[];
}

// Convert DB TemplateSection to MappingSectionInfo
export function templateSectionToMappingInfo(section: TemplateSection): MappingSectionInfo {
  return {
    id: section.id,
    name: section.name,
    description: section.description,
    aiPromptHints: section.aiPromptHints,
    isRequired: section.isRequired,
    displayOrder: section.displayOrder,
    minLength: section.minLength,
    maxLength: section.maxLength,
  };
}
