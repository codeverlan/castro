import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { processingPrompts } from './processingPrompts';
import { intakeqNoteTypes } from './intakeqNoteTypes';

// Enum for template section field types
export const fieldTypeEnum = pgEnum('field_type', [
  'text',
  'textarea',
  'select',
  'multiselect',
  'checkbox',
  'date',
  'time',
  'number',
]);

// Enum for template status
export const templateStatusEnum = pgEnum('template_status', [
  'draft',
  'active',
  'archived',
]);

// Note Templates table - stores clinical documentation templates
export const noteTemplates = pgTable('note_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // Template type (e.g., SOAP, DAP, BIRP, Custom)
  templateType: varchar('template_type', { length: 100 }).notNull(),
  // Whether this is a system-provided default template
  isDefault: boolean('is_default').default(false).notNull(),
  // Template status
  status: templateStatusEnum('status').default('active').notNull(),
  // Version number for template versioning
  version: integer('version').default(1).notNull(),
  // Reference to parent template for versioning
  parentTemplateId: uuid('parent_template_id'),

  // AI Processing Prompt associations
  defaultTransformPromptId: uuid('default_transform_prompt_id')
    .references(() => processingPrompts.id, { onDelete: 'set null' }),
  defaultExtractPromptId: uuid('default_extract_prompt_id')
    .references(() => processingPrompts.id, { onDelete: 'set null' }),

  // IntakeQ Note Type association
  intakeqNoteTypeId: uuid('intakeq_note_type_id')
    .references(() => intakeqNoteTypes.id, { onDelete: 'set null' }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Template Sections table - defines sections within a template
export const templateSections = pgTable('template_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => noteTemplates.id, { onDelete: 'cascade' }),
  // Section name (e.g., "Subjective", "Objective", "Assessment", "Plan")
  name: varchar('name', { length: 255 }).notNull(),
  // Section description/instructions
  description: text('description'),
  // Display order within the template
  displayOrder: integer('display_order').notNull(),
  // Whether this section is required
  isRequired: boolean('is_required').default(true).notNull(),
  // Minimum content length if required (in characters)
  minLength: integer('min_length'),
  // Maximum content length (in characters)
  maxLength: integer('max_length'),
  // Placeholder text for the section
  placeholder: text('placeholder'),
  // AI prompt hints for content mapping
  aiPromptHints: text('ai_prompt_hints'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Template Fields table - defines specific fields within sections
export const templateFields = pgTable('template_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id')
    .notNull()
    .references(() => templateSections.id, { onDelete: 'cascade' }),
  // Field label
  label: varchar('label', { length: 255 }).notNull(),
  // Field type
  fieldType: fieldTypeEnum('field_type').notNull(),
  // Whether this field is required
  isRequired: boolean('is_required').default(false).notNull(),
  // Display order within the section
  displayOrder: integer('display_order').notNull(),
  // Default value for the field
  defaultValue: text('default_value'),
  // Options for select/multiselect fields (stored as JSON array)
  options: jsonb('options'),
  // Validation rules (stored as JSON)
  validationRules: jsonb('validation_rules'),
  // Help text for the field
  helpText: text('help_text'),
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Define relations
export const noteTemplatesRelations = relations(noteTemplates, ({ many, one }) => ({
  sections: many(templateSections),
  parentTemplate: one(noteTemplates, {
    fields: [noteTemplates.parentTemplateId],
    references: [noteTemplates.id],
  }),
  // AI Processing Prompt relations
  defaultTransformPrompt: one(processingPrompts, {
    fields: [noteTemplates.defaultTransformPromptId],
    references: [processingPrompts.id],
    relationName: 'templateTransformPrompt',
  }),
  defaultExtractPrompt: one(processingPrompts, {
    fields: [noteTemplates.defaultExtractPromptId],
    references: [processingPrompts.id],
    relationName: 'templateExtractPrompt',
  }),
  // IntakeQ Note Type relation
  intakeqNoteType: one(intakeqNoteTypes, {
    fields: [noteTemplates.intakeqNoteTypeId],
    references: [intakeqNoteTypes.id],
  }),
}));

export const templateSectionsRelations = relations(templateSections, ({ one, many }) => ({
  template: one(noteTemplates, {
    fields: [templateSections.templateId],
    references: [noteTemplates.id],
  }),
  fields: many(templateFields),
}));

export const templateFieldsRelations = relations(templateFields, ({ one }) => ({
  section: one(templateSections, {
    fields: [templateFields.sectionId],
    references: [templateSections.id],
  }),
}));

// Type exports for use in application code
export type NoteTemplate = typeof noteTemplates.$inferSelect;
export type NewNoteTemplate = typeof noteTemplates.$inferInsert;
export type TemplateSection = typeof templateSections.$inferSelect;
export type NewTemplateSection = typeof templateSections.$inferInsert;
export type TemplateField = typeof templateFields.$inferSelect;
export type NewTemplateField = typeof templateFields.$inferInsert;
