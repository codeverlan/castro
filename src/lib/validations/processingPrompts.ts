import { z } from 'zod';

// =============================================================================
// Zod Schemas for Processing Prompts
// =============================================================================
// Validation schemas for AI processing prompts used in transcription pipeline.
// =============================================================================

// Permissive UUID regex
const permissiveUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// -----------------------------------------------------------------------------
// Enum Schemas
// -----------------------------------------------------------------------------

export const promptTypeSchema = z.enum([
  'transform',  // Rewrite raw text (clinical language, format)
  'extract',    // Extract specific fields/sections
  'combined',   // Both transform and extract
]);

export const outputFormatSchema = z.enum([
  'markdown',
  'json',
  'plain',
  'html',
]);

// -----------------------------------------------------------------------------
// Query Schema
// -----------------------------------------------------------------------------

export const promptQuerySchema = z.object({
  promptType: promptTypeSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

// -----------------------------------------------------------------------------
// Create Schema
// -----------------------------------------------------------------------------

export const createProcessingPromptSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name cannot exceed 255 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim()
    .optional()
    .nullable(),
  promptType: promptTypeSchema,
  systemPrompt: z
    .string()
    .min(1, 'System prompt is required')
    .max(10000, 'System prompt cannot exceed 10000 characters'),
  userPromptTemplate: z
    .string()
    .min(1, 'User prompt template is required')
    .max(10000, 'User prompt template cannot exceed 10000 characters'),
  outputFormat: outputFormatSchema.default('markdown'),
  targetModel: z
    .string()
    .max(100, 'Target model cannot exceed 100 characters')
    .trim()
    .optional()
    .nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// -----------------------------------------------------------------------------
// Update Schema
// -----------------------------------------------------------------------------

export const updateProcessingPromptSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name cannot exceed 255 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim()
    .optional()
    .nullable(),
  promptType: promptTypeSchema.optional(),
  systemPrompt: z
    .string()
    .min(1, 'System prompt is required')
    .max(10000, 'System prompt cannot exceed 10000 characters')
    .optional(),
  userPromptTemplate: z
    .string()
    .min(1, 'User prompt template is required')
    .max(10000, 'User prompt template cannot exceed 10000 characters')
    .optional(),
  outputFormat: outputFormatSchema.optional(),
  targetModel: z
    .string()
    .max(100, 'Target model cannot exceed 100 characters')
    .trim()
    .optional()
    .nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type PromptType = z.infer<typeof promptTypeSchema>;
export type OutputFormat = z.infer<typeof outputFormatSchema>;
export type PromptQuery = z.infer<typeof promptQuerySchema>;
export type CreateProcessingPrompt = z.infer<typeof createProcessingPromptSchema>;
export type UpdateProcessingPrompt = z.infer<typeof updateProcessingPromptSchema>;
