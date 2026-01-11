/**
 * Gap Detection Engine Validation Schemas
 * Zod schemas for runtime validation of gap detection requests and responses
 */

import { z } from 'zod';

// =============================================================================
// Enum Schemas
// =============================================================================

export const gapSeveritySchema = z.enum(['critical', 'important', 'minor']);

export const gapTypeSchema = z.enum([
  'missing_required_section',
  'insufficient_content',
  'missing_required_field',
  'low_confidence_content',
  'incomplete_clinical_data',
  'missing_safety_assessment',
  'unclear_treatment_plan',
  'missing_session_context',
]);

export const sectionStatusSchema = z.enum(['complete', 'partial', 'missing']);

// =============================================================================
// Input Schemas
// =============================================================================

export const templateFieldInfoSchema = z.object({
  id: z.string().uuid(),
  sectionId: z.string().uuid(),
  label: z.string().min(1),
  fieldType: z.string(),
  isRequired: z.boolean(),
  helpText: z.string().nullable().optional(),
  validationRules: z.record(z.unknown()).nullable().optional(),
});

export const clinicalContextSummarySchema = z.object({
  presentingIssues: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  interventions: z.array(z.string()).optional(),
  riskFactors: z.array(z.string()).optional(),
  sessionType: z.string().optional(),
});

export const mappingSectionInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  aiPromptHints: z.string().nullable(),
  isRequired: z.boolean(),
  displayOrder: z.number().int().min(0),
  minLength: z.number().int().min(0).nullable(),
  maxLength: z.number().int().min(1).nullable(),
});

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

export const gapDetectionRequestSchema = z.object({
  sessionId: z.string().uuid(),
  mappedSections: z.array(mappedSectionContentSchema).min(1),
  templateSections: z.array(mappingSectionInfoSchema).min(1),
  templateFields: z.array(templateFieldInfoSchema).optional(),
  transcription: z.string().optional(),
  clinicalContext: clinicalContextSummarySchema.optional(),
});

export const gapDetectionOptionsSchema = z.object({
  enableLLMAnalysis: z.boolean().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  confidenceThreshold: z.number().min(0).max(100).optional(),
  enforceSafetyChecks: z.boolean().optional(),
  minimumContentLength: z.number().int().min(1).optional(),
  maxQuestionsPerGap: z.number().int().min(1).max(10).optional(),
});

// =============================================================================
// Result Schemas
// =============================================================================

export const detectedGapSchema = z.object({
  id: z.string().uuid(),
  sectionId: z.string().uuid(),
  sectionName: z.string(),
  gapType: gapTypeSchema,
  description: z.string(),
  missingElements: z.array(z.string()),
  severity: gapSeveritySchema,
  primaryQuestion: z.string(),
  alternativeQuestions: z.array(z.string()),
  clinicalRationale: z.string(),
  priority: z.number().int().min(1),
  confidence: z.number().min(0).max(100),
  relatedFieldId: z.string().uuid().optional(),
  contentSuggestions: z.array(z.string()).optional(),
});

export const sectionScoreSchema = z.object({
  sectionId: z.string().uuid(),
  sectionName: z.string(),
  score: z.number().min(0).max(100),
  isRequired: z.boolean(),
  gapCount: z.number().int().min(0),
  status: sectionStatusSchema,
});

export const gapSummarySchema = z.object({
  totalGaps: z.number().int().min(0),
  criticalGaps: z.number().int().min(0),
  importantGaps: z.number().int().min(0),
  minorGaps: z.number().int().min(0),
  sectionsWithGaps: z.number().int().min(0),
  totalSections: z.number().int().min(0),
  requiredSectionsFilled: z.number().int().min(0),
  totalRequiredSections: z.number().int().min(0),
});

export const gapDetectionMetricsSchema = z.object({
  totalTimeMs: z.number().int().min(0),
  ruleBasedTimeMs: z.number().int().min(0),
  llmAnalysisTimeMs: z.number().int().min(0),
  questionGenerationTimeMs: z.number().int().min(0),
  gapsDetected: z.number().int().min(0),
});

export const gapDetectionResultSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().uuid(),
  gaps: z.array(detectedGapSchema),
  completenessScore: z.number().min(0).max(100),
  sectionScores: z.array(sectionScoreSchema),
  summary: gapSummarySchema,
  recommendations: z.array(z.string()),
  metrics: gapDetectionMetricsSchema,
  error: z.string().optional(),
});

// =============================================================================
// API Request/Response Schemas
// =============================================================================

export const analyzeGapsRequestSchema = z.object({
  sessionId: z.string().uuid(),
  options: gapDetectionOptionsSchema.optional(),
});

export const analyzeGapsResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().uuid(),
  completenessScore: z.number().min(0).max(100).optional(),
  totalGaps: z.number().int().min(0).optional(),
  criticalGaps: z.number().int().min(0).optional(),
  processingTimeMs: z.number().int().min(0).optional(),
  error: z.string().optional(),
});

export const getGapsRequestSchema = z.object({
  sessionId: z.string().uuid(),
  includeResolved: z.boolean().default(false),
  severity: gapSeveritySchema.optional(),
});

export const resolveGapRequestSchema = z.object({
  gapId: z.string().uuid(),
  userResponse: z.string().min(1, 'Response is required'),
});

// =============================================================================
// Type Exports
// =============================================================================

export type GapSeverity = z.infer<typeof gapSeveritySchema>;
export type GapType = z.infer<typeof gapTypeSchema>;
export type SectionStatus = z.infer<typeof sectionStatusSchema>;
export type TemplateFieldInfoInput = z.infer<typeof templateFieldInfoSchema>;
export type ClinicalContextSummaryInput = z.infer<typeof clinicalContextSummarySchema>;
export type MappingSectionInfoInput = z.infer<typeof mappingSectionInfoSchema>;
export type MappedSectionContentInput = z.infer<typeof mappedSectionContentSchema>;
export type GapDetectionRequestInput = z.infer<typeof gapDetectionRequestSchema>;
export type GapDetectionOptionsInput = z.infer<typeof gapDetectionOptionsSchema>;
export type DetectedGapInput = z.infer<typeof detectedGapSchema>;
export type SectionScoreInput = z.infer<typeof sectionScoreSchema>;
export type GapSummaryInput = z.infer<typeof gapSummarySchema>;
export type GapDetectionMetricsInput = z.infer<typeof gapDetectionMetricsSchema>;
export type GapDetectionResultInput = z.infer<typeof gapDetectionResultSchema>;
export type AnalyzeGapsRequestInput = z.infer<typeof analyzeGapsRequestSchema>;
export type AnalyzeGapsResponseInput = z.infer<typeof analyzeGapsResponseSchema>;
export type GetGapsRequestInput = z.infer<typeof getGapsRequestSchema>;
export type ResolveGapRequestInput = z.infer<typeof resolveGapRequestSchema>;

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Validate a gap detection request
 */
export function validateGapDetectionRequest(
  data: unknown
): { success: true; data: GapDetectionRequestInput } | { success: false; errors: z.ZodError } {
  const result = gapDetectionRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate gap detection options
 */
export function validateGapDetectionOptions(
  data: unknown
): { success: true; data: GapDetectionOptionsInput } | { success: false; errors: z.ZodError } {
  const result = gapDetectionOptionsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate an analyze gaps API request
 */
export function validateAnalyzeGapsRequest(
  data: unknown
): { success: true; data: AnalyzeGapsRequestInput } | { success: false; errors: z.ZodError } {
  const result = analyzeGapsRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a get gaps API request
 */
export function validateGetGapsRequest(
  data: unknown
): { success: true; data: GetGapsRequestInput } | { success: false; errors: z.ZodError } {
  const result = getGapsRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a resolve gap request
 */
export function validateResolveGapRequest(
  data: unknown
): { success: true; data: ResolveGapRequestInput } | { success: false; errors: z.ZodError } {
  const result = resolveGapRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
