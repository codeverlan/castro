/**
 * Content Mapping Engine Validation Schemas
 * Zod schemas for runtime validation of mapping requests and responses
 */

import { z } from 'zod';

// =============================================================================
// Enum Schemas
// =============================================================================

export const gapSeveritySchema = z.enum(['critical', 'important', 'minor']);

// =============================================================================
// Clinical Context Schema
// =============================================================================

export const clinicalContextSchema = z.object({
  presentingIssues: z.array(z.string()).default([]),
  symptoms: z.array(z.string()).default([]),
  interventions: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  riskFactors: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  emotionalThemes: z.array(z.string()).default([]),
  clientQuotes: z.array(z.string()).default([]),
  sessionDynamics: z.string().optional(),
  homework: z.array(z.string()).default([]),
});

// =============================================================================
// Section Info Schemas
// =============================================================================

export const mappingSectionInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  aiPromptHints: z.string().nullable(),
  isRequired: z.boolean(),
  displayOrder: z.number().int().min(0),
  minLength: z.number().int().min(0).nullable(),
  maxLength: z.number().int().min(1).nullable(),
});

// =============================================================================
// Request Schemas
// =============================================================================

export const sessionMetadataSchema = z.object({
  sessionDate: z.string().optional(),
  sessionNumber: z.number().int().positive().optional(),
  sessionType: z.string().optional(),
  duration: z.number().int().positive().optional(),
});

export const contentMappingEngineRequestSchema = z.object({
  sessionId: z.string().uuid(),
  transcription: z.string().min(1, 'Transcription text is required'),
  sections: z.array(mappingSectionInfoSchema).min(1, 'At least one section is required'),
  patientContext: z.string().optional(),
  sessionMetadata: sessionMetadataSchema.optional(),
});

export const contentMappingEngineOptionsSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  enableRewriting: z.boolean().optional(),
  enableGapAnalysis: z.boolean().optional(),
  confidenceThreshold: z.number().min(0).max(100).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

// =============================================================================
// Result Schemas
// =============================================================================

export const mappedSectionContentSchema = z.object({
  sectionId: z.string().uuid(),
  sectionName: z.string(),
  rawContent: z.string(),
  processedContent: z.string(),
  confidence: z.number().min(0).max(100),
  extractedKeywords: z.array(z.string()),
  needsReview: z.boolean(),
  reviewReason: z.string().optional(),
  suggestedEdits: z.array(z.string()).optional(),
  displayOrder: z.number().int().min(0),
});

export const documentationGapSchema = z.object({
  sectionId: z.string().uuid(),
  sectionName: z.string(),
  description: z.string(),
  missingElements: z.array(z.string()),
  severity: gapSeveritySchema,
  suggestedQuestions: z.array(z.string()),
  priority: z.number().int().min(1),
});

export const mappingMetricsSchema = z.object({
  totalProcessingTimeMs: z.number().int().min(0),
  extractionTimeMs: z.number().int().min(0),
  rewriteTimeMs: z.number().int().min(0),
  gapAnalysisTimeMs: z.number().int().min(0),
  modelUsed: z.string(),
  llmCallCount: z.number().int().min(0),
  estimatedTokens: z.number().int().min(0).optional(),
});

export const contentMappingEngineResultSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().uuid(),
  mappedSections: z.array(mappedSectionContentSchema),
  clinicalContext: clinicalContextSchema,
  gaps: z.array(documentationGapSchema),
  completenessScore: z.number().min(0).max(100),
  unmappedContent: z.string().optional(),
  recommendations: z.array(z.string()),
  metrics: mappingMetricsSchema,
  error: z.string().optional(),
});

// =============================================================================
// Database Storage Schemas
// =============================================================================

export const storeMappingRequestSchema = z.object({
  sessionId: z.string().uuid(),
  mappedSections: z.array(mappedSectionContentSchema),
  gaps: z.array(documentationGapSchema),
});

export const updateSectionContentSchema = z.object({
  sectionContentId: z.string().uuid(),
  processedContent: z.string().optional(),
  userProvidedContent: z.string().optional(),
  finalContent: z.string().optional(),
  needsReview: z.boolean().optional(),
}).refine(
  (data) =>
    data.processedContent !== undefined ||
    data.userProvidedContent !== undefined ||
    data.finalContent !== undefined ||
    data.needsReview !== undefined,
  { message: 'At least one field must be provided for update' }
);

export const resolveGapSchema = z.object({
  gapId: z.string().uuid(),
  userResponse: z.string().min(1, 'User response is required'),
});

// =============================================================================
// API Request/Response Schemas
// =============================================================================

// Request to process a session's transcription
export const processMappingRequestSchema = z.object({
  sessionId: z.string().uuid(),
  options: contentMappingEngineOptionsSchema.optional(),
});

// Response from processing
export const processMappingResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().uuid(),
  completenessScore: z.number().min(0).max(100).optional(),
  sectionsProcessed: z.number().int().min(0).optional(),
  gapsIdentified: z.number().int().min(0).optional(),
  processingTimeMs: z.number().int().min(0).optional(),
  error: z.string().optional(),
});

// Get mapping results for a session
export const getMappingResultsRequestSchema = z.object({
  sessionId: z.string().uuid(),
  includeGaps: z.boolean().default(true),
  includeMetrics: z.boolean().default(false),
});

// =============================================================================
// Type Exports
// =============================================================================

export type GapSeverity = z.infer<typeof gapSeveritySchema>;
export type ClinicalContextInput = z.infer<typeof clinicalContextSchema>;
export type MappingSectionInfoInput = z.infer<typeof mappingSectionInfoSchema>;
export type SessionMetadataInput = z.infer<typeof sessionMetadataSchema>;
export type ContentMappingEngineRequestInput = z.infer<typeof contentMappingEngineRequestSchema>;
export type ContentMappingEngineOptionsInput = z.infer<typeof contentMappingEngineOptionsSchema>;
export type MappedSectionContentInput = z.infer<typeof mappedSectionContentSchema>;
export type DocumentationGapInput = z.infer<typeof documentationGapSchema>;
export type MappingMetricsInput = z.infer<typeof mappingMetricsSchema>;
export type ContentMappingEngineResultInput = z.infer<typeof contentMappingEngineResultSchema>;
export type StoreMappingRequestInput = z.infer<typeof storeMappingRequestSchema>;
export type UpdateSectionContentInput = z.infer<typeof updateSectionContentSchema>;
export type ResolveGapInput = z.infer<typeof resolveGapSchema>;
export type ProcessMappingRequestInput = z.infer<typeof processMappingRequestSchema>;
export type ProcessMappingResponseInput = z.infer<typeof processMappingResponseSchema>;
export type GetMappingResultsRequestInput = z.infer<typeof getMappingResultsRequestSchema>;

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Validate a content mapping engine request
 */
export function validateMappingRequest(
  data: unknown
): { success: true; data: ContentMappingEngineRequestInput } | { success: false; errors: z.ZodError } {
  const result = contentMappingEngineRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate mapping engine options
 */
export function validateMappingOptions(
  data: unknown
): { success: true; data: ContentMappingEngineOptionsInput } | { success: false; errors: z.ZodError } {
  const result = contentMappingEngineOptionsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a section content update
 */
export function validateSectionUpdate(
  data: unknown
): { success: true; data: UpdateSectionContentInput } | { success: false; errors: z.ZodError } {
  const result = updateSectionContentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a gap resolution request
 */
export function validateGapResolution(
  data: unknown
): { success: true; data: ResolveGapInput } | { success: false; errors: z.ZodError } {
  const result = resolveGapSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
