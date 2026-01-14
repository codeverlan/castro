import { z } from 'zod';

// =============================================================================
// Zod Schemas for IntakeQ Note Types
// =============================================================================
// Validation schemas for IntakeQ form/note type definitions with field mapping.
// =============================================================================

// -----------------------------------------------------------------------------
// Field Definition Schema
// -----------------------------------------------------------------------------

export const intakeqFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'select',
  'checkbox',
  'date',
  'radio',
  'number',
]);

export const intakeqFieldDefinitionSchema = z.object({
  fieldId: z
    .string()
    .min(1, 'Field ID is required')
    .max(255, 'Field ID cannot exceed 255 characters'),
  fieldName: z
    .string()
    .min(1, 'Field name is required')
    .max(255, 'Field name cannot exceed 255 characters'),
  fieldType: intakeqFieldTypeSchema,
  isRequired: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  maxLength: z.number().int().positive().optional(),
  defaultValue: z.string().optional(),
  description: z.string().max(500).optional(),
  mappedSection: z.string().max(255).optional(),
});

// -----------------------------------------------------------------------------
// Query Schema
// -----------------------------------------------------------------------------

export const noteTypeQuerySchema = z.object({
  isActive: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

// -----------------------------------------------------------------------------
// Create Schema
// -----------------------------------------------------------------------------

export const createIntakeqNoteTypeSchema = z.object({
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
  intakeqFormId: z
    .string()
    .max(255, 'IntakeQ Form ID cannot exceed 255 characters')
    .trim()
    .optional()
    .nullable(),
  urlPattern: z
    .string()
    .max(512, 'URL pattern cannot exceed 512 characters')
    .trim()
    .optional()
    .nullable(),
  fields: z.array(intakeqFieldDefinitionSchema).min(1, 'At least one field is required'),
  isActive: z.boolean().default(true),
});

// -----------------------------------------------------------------------------
// Update Schema
// -----------------------------------------------------------------------------

export const updateIntakeqNoteTypeSchema = z.object({
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
  intakeqFormId: z
    .string()
    .max(255, 'IntakeQ Form ID cannot exceed 255 characters')
    .trim()
    .optional()
    .nullable(),
  urlPattern: z
    .string()
    .max(512, 'URL pattern cannot exceed 512 characters')
    .trim()
    .optional()
    .nullable(),
  fields: z.array(intakeqFieldDefinitionSchema).optional(),
  isActive: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type IntakeQFieldType = z.infer<typeof intakeqFieldTypeSchema>;
export type IntakeQFieldDefinitionInput = z.infer<typeof intakeqFieldDefinitionSchema>;
export type NoteTypeQuery = z.infer<typeof noteTypeQuerySchema>;
export type CreateIntakeqNoteType = z.infer<typeof createIntakeqNoteTypeSchema>;
export type UpdateIntakeqNoteType = z.infer<typeof updateIntakeqNoteTypeSchema>;
