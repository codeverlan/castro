import { z } from 'zod';
import { fieldTypeSchema } from './noteTemplates';

// =============================================================================
// Zod Schemas for Gap Prompt UI
// =============================================================================
// These schemas provide validation for the gap prompt UI component.
// =============================================================================

// -----------------------------------------------------------------------------
// Gap Field Type Schema
// -----------------------------------------------------------------------------

// Options for select and multiselect fields
export const gapFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
});

// Gap field configuration
export const gapFieldConfigSchema = z.object({
  id: z.string(),
  gapId: z.string().uuid(),
  fieldType: fieldTypeSchema,
  label: z.string().min(1),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  isRequired: z.boolean().default(true),
  options: z.array(gapFieldOptionSchema).optional(),
  validationRules: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    patternMessage: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
  }).optional(),
  defaultValue: z.union([z.string(), z.array(z.string()), z.boolean()]).optional(),
});

// -----------------------------------------------------------------------------
// Gap Prompt Data Schema
// -----------------------------------------------------------------------------

export const gapPromptSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  sectionName: z.string(),
  gapDescription: z.string(),
  userPrompt: z.string(),
  priority: z.number().int().min(0),
  isResolved: z.boolean(),
  field: gapFieldConfigSchema,
});

// Array of gap prompts
export const gapPromptsArraySchema = z.array(gapPromptSchema);

// -----------------------------------------------------------------------------
// Gap Response Schema
// -----------------------------------------------------------------------------

export const gapResponseSchema = z.object({
  gapId: z.string().uuid(),
  value: z.union([
    z.string(),
    z.array(z.string()),
    z.boolean(),
    z.null(),
  ]),
});

export const submitGapResponsesSchema = z.object({
  sessionId: z.string().uuid(),
  responses: z.array(gapResponseSchema),
});

// -----------------------------------------------------------------------------
// Gap Prompt UI State Schema
// -----------------------------------------------------------------------------

export const gapPromptUIStateSchema = z.object({
  currentGapIndex: z.number().int().min(0),
  gaps: gapPromptsArraySchema,
  responses: z.record(z.string(), z.union([
    z.string(),
    z.array(z.string()),
    z.boolean(),
    z.null(),
  ])),
  isSubmitting: z.boolean(),
  errors: z.record(z.string(), z.string()),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type GapFieldOption = z.infer<typeof gapFieldOptionSchema>;
export type GapFieldConfig = z.infer<typeof gapFieldConfigSchema>;
export type GapPrompt = z.infer<typeof gapPromptSchema>;
export type GapResponse = z.infer<typeof gapResponseSchema>;
export type SubmitGapResponses = z.infer<typeof submitGapResponsesSchema>;
export type GapPromptUIState = z.infer<typeof gapPromptUIStateSchema>;

// Value type for gap responses
export type GapResponseValue = string | string[] | boolean | null;
