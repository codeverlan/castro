import { z } from 'zod';

// =============================================================================
// Zod Schemas for Note Templates
// =============================================================================
// These schemas provide runtime validation for note template data.
// They mirror the Drizzle schema but add validation rules for API boundaries.
// =============================================================================

// More permissive UUID regex (accepts any UUID format, not just versions 1-8)
const permissiveUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// -----------------------------------------------------------------------------
// Enum Schemas
// -----------------------------------------------------------------------------

export const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'select',
  'multiselect',
  'checkbox',
  'date',
  'time',
  'number',
]);

export const templateStatusSchema = z.enum([
  'draft',
  'active',
  'archived',
]);

// -----------------------------------------------------------------------------
// Validation Rule Schemas (for JSONB validationRules field)
// -----------------------------------------------------------------------------

export const textValidationRulesSchema = z.object({
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
}).optional();

export const numberValidationRulesSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  integer: z.boolean().optional(),
}).optional();

export const dateValidationRulesSchema = z.object({
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
  allowFuture: z.boolean().optional(),
  allowPast: z.boolean().optional(),
}).optional();

export const validationRulesSchema = z.union([
  textValidationRulesSchema,
  numberValidationRulesSchema,
  dateValidationRulesSchema,
  z.record(z.unknown()),
]).nullable();

// -----------------------------------------------------------------------------
// Options Schema (for select/multiselect fields)
// -----------------------------------------------------------------------------

export const fieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
});

export const fieldOptionsSchema = z.array(fieldOptionSchema).nullable();

// -----------------------------------------------------------------------------
// Template Field Schemas
// -----------------------------------------------------------------------------

export const templateFieldSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  sectionId: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  label: z.string().min(1).max(255),
  fieldType: fieldTypeSchema,
  isRequired: z.boolean(),
  displayOrder: z.number().int().min(0),
  defaultValue: z.string().nullable(),
  options: fieldOptionsSchema,
  validationRules: validationRulesSchema,
  helpText: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createTemplateFieldSchema = z.object({
  sectionId: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  label: z.string().min(1, 'Label is required').max(255, 'Label must be 255 characters or less'),
  fieldType: fieldTypeSchema,
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().min(0),
  defaultValue: z.string().optional().nullable(),
  options: fieldOptionsSchema.optional(),
  validationRules: validationRulesSchema.optional(),
  helpText: z.string().optional().nullable(),
});

export const updateTemplateFieldSchema = createTemplateFieldSchema.partial().extend({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
});

// -----------------------------------------------------------------------------
// Template Section Schemas
// -----------------------------------------------------------------------------

export const templateSectionSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  templateId: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  displayOrder: z.number().int().min(0),
  isRequired: z.boolean(),
  minLength: z.number().int().min(0).nullable(),
  maxLength: z.number().int().min(1).nullable(),
  placeholder: z.string().nullable(),
  aiPromptHints: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createTemplateSectionSchema = z.object({
  templateId: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  name: z.string().min(1, 'Section name is required').max(255, 'Section name must be 255 characters or less'),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0),
  isRequired: z.boolean().default(true),
  minLength: z.number().int().min(0).optional().nullable(),
  maxLength: z.number().int().min(1).optional().nullable(),
  placeholder: z.string().optional().nullable(),
  aiPromptHints: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.minLength != null && data.maxLength != null) {
      return data.minLength <= data.maxLength;
    }
    return true;
  },
  {
    message: 'Minimum length cannot be greater than maximum length',
    path: ['minLength'],
  }
);

export const updateTemplateSectionSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  templateId: z.string().regex(permissiveUuidRegex, "Invalid UUID format").optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
  minLength: z.number().int().min(0).optional().nullable(),
  maxLength: z.number().int().min(1).optional().nullable(),
  placeholder: z.string().optional().nullable(),
  aiPromptHints: z.string().optional().nullable(),
});

// Section with nested fields
export const templateSectionWithFieldsSchema = templateSectionSchema.extend({
  fields: z.array(templateFieldSchema),
});

// -----------------------------------------------------------------------------
// Note Template Schemas
// -----------------------------------------------------------------------------

export const noteTemplateSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  templateType: z.string().min(1).max(100),
  isDefault: z.boolean(),
  status: templateStatusSchema,
  version: z.number().int().min(1),
  parentTemplateId: z.string().regex(permissiveUuidRegex, "Invalid UUID format").nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createNoteTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255, 'Template name must be 255 characters or less'),
  description: z.string().optional().nullable(),
  templateType: z.string().min(1, 'Template type is required').max(100, 'Template type must be 100 characters or less'),
  isDefault: z.boolean().default(false),
  status: templateStatusSchema.default('draft'),
  version: z.number().int().min(1).default(1),
  parentTemplateId: z.string().regex(permissiveUuidRegex, "Invalid UUID format").optional().nullable(),
});

export const updateNoteTemplateSchema = z.object({
  id: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  templateType: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  status: templateStatusSchema.optional(),
  version: z.number().int().min(1).optional(),
  parentTemplateId: z.string().regex(permissiveUuidRegex, "Invalid UUID format").optional().nullable(),
});

// Template with nested sections
export const noteTemplateWithSectionsSchema = noteTemplateSchema.extend({
  sections: z.array(templateSectionSchema),
});

// Full template with sections and fields
export const noteTemplateFullSchema = noteTemplateSchema.extend({
  sections: z.array(templateSectionWithFieldsSchema),
});

// -----------------------------------------------------------------------------
// API Request/Response Schemas
// -----------------------------------------------------------------------------

// Create a full template with sections and fields in one request
export const createFullTemplateSchema = z.object({
  template: createNoteTemplateSchema,
  sections: z.array(
    z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional().nullable(),
      displayOrder: z.number().int().min(0),
      isRequired: z.boolean().default(true),
      minLength: z.number().int().min(0).optional().nullable(),
      maxLength: z.number().int().min(1).optional().nullable(),
      placeholder: z.string().optional().nullable(),
      aiPromptHints: z.string().optional().nullable(),
      fields: z.array(
        z.object({
          label: z.string().min(1).max(255),
          fieldType: fieldTypeSchema,
          isRequired: z.boolean().default(false),
          displayOrder: z.number().int().min(0),
          defaultValue: z.string().optional().nullable(),
          options: fieldOptionsSchema.optional(),
          validationRules: validationRulesSchema.optional(),
          helpText: z.string().optional().nullable(),
        })
      ).optional().default([]),
    })
  ).optional().default([]),
});

// Clone template request
export const cloneTemplateSchema = z.object({
  sourceTemplateId: z.string().regex(permissiveUuidRegex, "Invalid UUID format"),
  newName: z.string().min(1).max(255),
  incrementVersion: z.boolean().default(false),
});

// Template query filters
export const templateQuerySchema = z.object({
  status: templateStatusSchema.optional(),
  templateType: z.string().optional(),
  isDefault: z.boolean().optional(),
  includeArchived: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type TemplateStatus = z.infer<typeof templateStatusSchema>;
export type ValidationRules = z.infer<typeof validationRulesSchema>;
export type FieldOption = z.infer<typeof fieldOptionSchema>;
export type FieldOptions = z.infer<typeof fieldOptionsSchema>;

export type TemplateFieldInput = z.infer<typeof templateFieldSchema>;
export type CreateTemplateFieldInput = z.infer<typeof createTemplateFieldSchema>;
export type UpdateTemplateFieldInput = z.infer<typeof updateTemplateFieldSchema>;

export type TemplateSectionInput = z.infer<typeof templateSectionSchema>;
export type CreateTemplateSectionInput = z.infer<typeof createTemplateSectionSchema>;
export type UpdateTemplateSectionInput = z.infer<typeof updateTemplateSectionSchema>;
export type TemplateSectionWithFields = z.infer<typeof templateSectionWithFieldsSchema>;

export type NoteTemplateInput = z.infer<typeof noteTemplateSchema>;
export type CreateNoteTemplateInput = z.infer<typeof createNoteTemplateSchema>;
export type UpdateNoteTemplateInput = z.infer<typeof updateNoteTemplateSchema>;
export type NoteTemplateWithSections = z.infer<typeof noteTemplateWithSectionsSchema>;
export type NoteTemplateFull = z.infer<typeof noteTemplateFullSchema>;

export type CreateFullTemplateInput = z.infer<typeof createFullTemplateSchema>;
export type CloneTemplateInput = z.infer<typeof cloneTemplateSchema>;
export type TemplateQueryInput = z.infer<typeof templateQuerySchema>;
