/**
 * Note Generation Service Validation Schemas
 * Zod schemas for runtime validation of note generation requests and responses
 */

import { z } from 'zod';

// =============================================================================
// Enum Schemas
// =============================================================================

export const clinicalToneSchema = z.enum(['clinical', 'formal', 'compassionate']);
export const noteFormatSchema = z.enum(['plain', 'markdown', 'html']);
export const templateTypeSchema = z.enum(['SOAP', 'DAP', 'BIRP', 'custom']);

// =============================================================================
// Clinical Context Schema
// =============================================================================

export const clinicalContextSchema = z.object({
  presentingIssues: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  interventions: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  riskFactors: z.array(z.string()).optional(),
  strengths: z.array(z.string()).optional(),
  emotionalThemes: z.array(z.string()).optional(),
  clientQuotes: z.array(z.string()).optional(),
  sessionDynamics: z.string().optional(),
  homework: z.array(z.string()).optional(),
});

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * Schema for generate note request
 */
export const generateNoteRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  templateId: z.string().uuid('Invalid template ID format'),
  templateType: templateTypeSchema.optional().default('SOAP'),
  targetTone: clinicalToneSchema.optional().default('clinical'),
  includeGapsSummary: z.boolean().optional().default(true),
  includeClinicalContext: z.boolean().optional().default(true),
  format: noteFormatSchema.optional().default('markdown'),
  customInstructions: z.string().max(2000).optional(),
});

/**
 * Schema for refine note request
 */
export const refineNoteRequestSchema = z.object({
  noteId: z.string().uuid('Invalid note ID format'),
  sessionId: z.string().uuid('Invalid session ID format'),
  instructions: z.string()
    .min(1, 'Refinement instructions are required')
    .max(2000, 'Instructions must be under 2000 characters'),
  preserveSections: z.array(z.string()).optional().default([]),
  targetTone: clinicalToneSchema.optional().default('clinical'),
});

/**
 * Schema for format note request
 */
export const formatNoteRequestSchema = z.object({
  noteId: z.string().uuid('Invalid note ID format'),
  targetFormat: noteFormatSchema,
  includeMetadata: z.boolean().optional().default(false),
  includeTimestamp: z.boolean().optional().default(true),
});

/**
 * Schema for note generation options
 */
export const noteGenerationOptionsSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.3),
  maxTokens: z.number().int().min(100).max(8000).optional().default(4000),
  timeout: z.number().int().min(5000).max(300000).optional().default(60000),
});

// =============================================================================
// Section and Content Schemas
// =============================================================================

export const sectionContentSchema = z.object({
  sectionId: z.string().uuid(),
  sectionName: z.string().min(1).max(255),
  rawContent: z.string().nullable(),
  processedContent: z.string().nullable(),
  userProvidedContent: z.string().nullable(),
  finalContent: z.string().nullable(),
  confidenceScore: z.number().min(0).max(100).nullable(),
  displayOrder: z.number().int().min(0),
});

export const resolvedGapSchema = z.object({
  gapId: z.string().uuid(),
  sectionName: z.string(),
  gapDescription: z.string(),
  userResponse: z.string(),
});

export const processedSectionSchema = z.object({
  name: z.string(),
  content: z.string(),
  displayOrder: z.number().int().min(0),
  confidence: z.number().min(0).max(100),
  hasUserInput: z.boolean(),
});

export const templateSectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  displayOrder: z.number().int().min(0),
  isRequired: z.boolean(),
  minLength: z.number().int().min(0).nullable(),
  maxLength: z.number().int().min(1).nullable(),
  aiPromptHints: z.string().nullable(),
});

// =============================================================================
// Result Schemas
// =============================================================================

/**
 * Schema for generated note section
 */
export const generatedNoteSectionSchema = z.object({
  name: z.string(),
  content: z.string(),
  displayOrder: z.number().int().min(0),
});

/**
 * Schema for generate note result
 */
export const generateNoteResultSchema = z.object({
  success: z.boolean(),
  noteId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  noteContent: z.string().optional(),
  plainTextContent: z.string().optional(),
  format: noteFormatSchema.optional(),
  wordCount: z.number().int().min(0).optional(),
  characterCount: z.number().int().min(0).optional(),
  sectionsIncluded: z.array(z.string()).optional(),
  processingTimeMs: z.number().int().min(0),
  modelUsed: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Schema for refine note result
 */
export const refineNoteResultSchema = z.object({
  success: z.boolean(),
  noteId: z.string().uuid().optional(),
  refinedContent: z.string().optional(),
  plainTextContent: z.string().optional(),
  changesApplied: z.array(z.string()).optional(),
  wordCount: z.number().int().min(0).optional(),
  characterCount: z.number().int().min(0).optional(),
  processingTimeMs: z.number().int().min(0),
  modelUsed: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Schema for format note result
 */
export const formatNoteResultSchema = z.object({
  success: z.boolean(),
  formattedContent: z.string().optional(),
  format: noteFormatSchema.optional(),
  error: z.string().optional(),
});

/**
 * Schema for note generation metrics
 */
export const noteGenerationMetricsSchema = z.object({
  totalProcessingTimeMs: z.number().int().min(0),
  llmProcessingTimeMs: z.number().int().min(0),
  databaseTimeMs: z.number().int().min(0),
  modelUsed: z.string(),
  inputTokensEstimate: z.number().int().min(0),
  outputTokensEstimate: z.number().int().min(0),
  sectionsProcessed: z.number().int().min(0),
  gapsIncorporated: z.number().int().min(0),
});

// =============================================================================
// LLM Response Schemas
// =============================================================================

/**
 * Schema for LLM note generation response
 */
export const llmNoteResponseSchema = z.object({
  note: z.object({
    sections: z.array(generatedNoteSectionSchema),
    fullContent: z.string(),
  }),
  metadata: z.object({
    wordCount: z.number().int().min(0),
    sectionsIncluded: z.array(z.string()),
    gapsIntegrated: z.number().int().min(0),
    reviewFlagsCount: z.number().int().min(0),
    clinicalTermsUsed: z.array(z.string()),
  }),
});

/**
 * Schema for LLM refine response
 */
export const llmRefineResponseSchema = z.object({
  refinedNote: z.object({
    fullContent: z.string(),
    sections: z.array(z.object({
      name: z.string(),
      content: z.string(),
      wasModified: z.boolean(),
    })),
  }),
  changes: z.object({
    changesApplied: z.array(z.string()),
    sectionsModified: z.array(z.string()),
    wordCount: z.number().int().min(0),
  }),
});

/**
 * Schema for LLM section rewrite response
 */
export const llmSectionRewriteResponseSchema = z.object({
  rewrittenContent: z.string(),
  clinicalTermsUsed: z.array(z.string()),
  wordCount: z.number().int().min(0),
  confidenceScore: z.number().min(0).max(100),
});

// =============================================================================
// API Schemas
// =============================================================================

/**
 * Schema for API generate note request body
 */
export const apiGenerateNoteRequestSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
  templateId: z.string().uuid().optional(),
  targetTone: clinicalToneSchema.optional(),
  format: noteFormatSchema.optional(),
  customInstructions: z.string().max(2000).optional(),
  options: noteGenerationOptionsSchema.optional(),
});

/**
 * Schema for API refine note request body
 */
export const apiRefineNoteRequestSchema = z.object({
  noteId: z.string().uuid('Invalid note ID format'),
  sessionId: z.string().uuid('Invalid session ID format'),
  instructions: z.string().min(1).max(2000),
  preserveSections: z.array(z.string()).optional(),
  targetTone: clinicalToneSchema.optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type ClinicalTone = z.infer<typeof clinicalToneSchema>;
export type NoteFormat = z.infer<typeof noteFormatSchema>;
export type TemplateType = z.infer<typeof templateTypeSchema>;
export type ClinicalContextInput = z.infer<typeof clinicalContextSchema>;
export type GenerateNoteRequestInput = z.infer<typeof generateNoteRequestSchema>;
export type RefineNoteRequestInput = z.infer<typeof refineNoteRequestSchema>;
export type FormatNoteRequestInput = z.infer<typeof formatNoteRequestSchema>;
export type NoteGenerationOptionsInput = z.infer<typeof noteGenerationOptionsSchema>;
export type SectionContentInput = z.infer<typeof sectionContentSchema>;
export type ResolvedGapInput = z.infer<typeof resolvedGapSchema>;
export type ProcessedSectionInput = z.infer<typeof processedSectionSchema>;
export type TemplateSectionInput = z.infer<typeof templateSectionSchema>;
export type GenerateNoteResultInput = z.infer<typeof generateNoteResultSchema>;
export type RefineNoteResultInput = z.infer<typeof refineNoteResultSchema>;
export type FormatNoteResultInput = z.infer<typeof formatNoteResultSchema>;
export type NoteGenerationMetricsInput = z.infer<typeof noteGenerationMetricsSchema>;
export type LLMNoteResponseInput = z.infer<typeof llmNoteResponseSchema>;
export type LLMRefineResponseInput = z.infer<typeof llmRefineResponseSchema>;
export type LLMSectionRewriteResponseInput = z.infer<typeof llmSectionRewriteResponseSchema>;
export type ApiGenerateNoteRequestInput = z.infer<typeof apiGenerateNoteRequestSchema>;
export type ApiRefineNoteRequestInput = z.infer<typeof apiRefineNoteRequestSchema>;

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Validate a generate note request
 */
export function validateGenerateNoteRequest(
  data: unknown
): { success: true; data: GenerateNoteRequestInput } | { success: false; errors: z.ZodError } {
  const result = generateNoteRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate a refine note request
 */
export function validateRefineNoteRequest(
  data: unknown
): { success: true; data: RefineNoteRequestInput } | { success: false; errors: z.ZodError } {
  const result = refineNoteRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate note generation options
 */
export function validateNoteGenerationOptions(
  data: unknown
): { success: true; data: NoteGenerationOptionsInput } | { success: false; errors: z.ZodError } {
  const result = noteGenerationOptionsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate LLM note generation response
 */
export function validateLLMNoteResponse(
  data: unknown
): { success: true; data: LLMNoteResponseInput } | { success: false; errors: z.ZodError } {
  const result = llmNoteResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate LLM refine response
 */
export function validateLLMRefineResponse(
  data: unknown
): { success: true; data: LLMRefineResponseInput } | { success: false; errors: z.ZodError } {
  const result = llmRefineResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validate API generate note request
 */
export function validateApiGenerateNoteRequest(
  data: unknown
): { success: true; data: ApiGenerateNoteRequestInput } | { success: false; errors: z.ZodError } {
  const result = apiGenerateNoteRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
