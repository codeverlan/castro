import { describe, it, expect } from 'vitest';
import {
  fieldTypeSchema,
  templateStatusSchema,
  fieldOptionSchema,
  fieldOptionsSchema,
  textValidationRulesSchema,
  numberValidationRulesSchema,
  dateValidationRulesSchema,
  validationRulesSchema,
  createTemplateFieldSchema,
  updateTemplateFieldSchema,
  templateFieldSchema,
  createTemplateSectionSchema,
  updateTemplateSectionSchema,
  templateSectionSchema,
  createNoteTemplateSchema,
  updateNoteTemplateSchema,
  noteTemplateSchema,
  createFullTemplateSchema,
  cloneTemplateSchema,
  templateQuerySchema,
} from '~/lib/validations/noteTemplates';

describe('Note Template Validations', () => {
  describe('Enum Schemas', () => {
    describe('fieldTypeSchema', () => {
      it('should accept all valid field types', () => {
        const validTypes = [
          'text',
          'textarea',
          'select',
          'multiselect',
          'checkbox',
          'date',
          'time',
          'number',
        ];

        validTypes.forEach((type) => {
          const result = fieldTypeSchema.safeParse(type);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid field types', () => {
        const invalidTypes = ['dropdown', 'radio', 'file', 'invalid'];

        invalidTypes.forEach((type) => {
          const result = fieldTypeSchema.safeParse(type);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('templateStatusSchema', () => {
      it('should accept all valid status values', () => {
        const validStatuses = ['draft', 'active', 'archived'];

        validStatuses.forEach((status) => {
          const result = templateStatusSchema.safeParse(status);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid status values', () => {
        const invalidStatuses = ['pending', 'deleted', 'inactive', 'published'];

        invalidStatuses.forEach((status) => {
          const result = templateStatusSchema.safeParse(status);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('Validation Rules Schemas', () => {
    describe('textValidationRulesSchema', () => {
      it('should validate text validation rules with pattern', () => {
        const rules = {
          pattern: '^[a-zA-Z]+$',
          patternMessage: 'Only letters allowed',
        };

        const result = textValidationRulesSchema.safeParse(rules);
        expect(result.success).toBe(true);
      });

      it('should validate text validation rules with pattern only', () => {
        const rules = {
          pattern: '^[0-9]{10}$',
        };

        const result = textValidationRulesSchema.safeParse(rules);
        expect(result.success).toBe(true);
      });

      it('should accept empty object (optional rules)', () => {
        const result = textValidationRulesSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should accept undefined (optional)', () => {
        const result = textValidationRulesSchema.safeParse(undefined);
        expect(result.success).toBe(true);
      });
    });

    describe('numberValidationRulesSchema', () => {
      it('should validate number validation rules with min and max', () => {
        const rules = {
          min: 0,
          max: 100,
          step: 1,
          integer: true,
        };

        const result = numberValidationRulesSchema.safeParse(rules);
        expect(result.success).toBe(true);
      });

      it('should validate number validation rules with min only', () => {
        const rules = {
          min: 18,
        };

        const result = numberValidationRulesSchema.safeParse(rules);
        expect(result.success).toBe(true);
      });

      it('should validate number validation rules with step only', () => {
        const rules = {
          step: 0.5,
        };

        const result = numberValidationRulesSchema.safeParse(rules);
        expect(result.success).toBe(true);
      });
    });

    describe('dateValidationRulesSchema', () => {
      it('should validate date validation rules with date range', () => {
        const rules = {
          minDate: '2024-01-01',
          maxDate: '2024-12-31',
          allowFuture: false,
          allowPast: true,
        };

        const result = dateValidationRulesSchema.safeParse(rules);
        expect(result.success).toBe(true);
      });

      it('should validate date validation rules with allow flags', () => {
        const rules = {
          allowFuture: true,
          allowPast: true,
        };

        const result = dateValidationRulesSchema.safeParse(rules);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Field Options Schemas', () => {
    describe('fieldOptionSchema', () => {
      it('should validate field option with all fields', () => {
        const option = {
          value: 'option-1',
          label: 'Option 1',
          disabled: false,
        };

        const result = fieldOptionSchema.safeParse(option);
        expect(result.success).toBe(true);
      });

      it('should validate field option without disabled field', () => {
        const option = {
          value: 'option-1',
          label: 'Option 1',
        };

        const result = fieldOptionSchema.safeParse(option);
        expect(result.success).toBe(true);
      });

      it('should reject option with missing value', () => {
        const option = {
          label: 'Option 1',
        };

        const result = fieldOptionSchema.safeParse(option);
        expect(result.success).toBe(false);
      });
    });

    describe('fieldOptionsSchema', () => {
      it('should validate array of field options', () => {
        const options = [
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
          { value: '3', label: 'Option 3' },
        ];

        const result = fieldOptionsSchema.safeParse(options);
        expect(result.success).toBe(true);
      });

      it('should accept null value', () => {
        const result = fieldOptionsSchema.safeParse(null);
        expect(result.success).toBe(true);
      });

      it('should reject array with invalid option', () => {
        const options = [
          { value: '1', label: 'Option 1' },
          { label: 'Option 2' }, // Missing value
        ];

        const result = fieldOptionsSchema.safeParse(options);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Template Field Schemas', () => {
    describe('createTemplateFieldSchema', () => {
      it('should validate valid template field', () => {
        const field = {
          sectionId: '00000000-0000-0000-0000-000000000001',
          label: 'Patient Name',
          fieldType: 'text',
          isRequired: true,
          displayOrder: 1,
          defaultValue: 'John Doe',
          options: null,
          validationRules: { pattern: '^[a-zA-Z ]+$' },
          helpText: 'Enter the patient\'s full name',
        };

        const result = createTemplateFieldSchema.safeParse(field);
        expect(result.success).toBe(true);
      });

      it('should validate field with select type and options', () => {
        const field = {
          sectionId: '00000000-0000-0000-0000-000000000001',
          label: 'Severity',
          fieldType: 'select',
          isRequired: true,
          displayOrder: 1,
          options: [
            { value: 'mild', label: 'Mild' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'severe', label: 'Severe' },
          ],
        };

        const result = createTemplateFieldSchema.safeParse(field);
        expect(result.success).toBe(true);
      });

      it('should apply default values', () => {
        const field = {
          sectionId: '00000000-0000-0000-0000-000000000001',
          label: 'Notes',
          fieldType: 'textarea',
          displayOrder: 1,
        };

        const result = createTemplateFieldSchema.safeParse(field);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isRequired).toBe(false);
        }
      });

      it('should reject field with invalid UUID for sectionId', () => {
        const field = {
          sectionId: 'not-a-uuid',
          label: 'Test',
          fieldType: 'text',
          isRequired: true,
          displayOrder: 1,
        };

        const result = createTemplateFieldSchema.safeParse(field);
        expect(result.success).toBe(false);
      });

      it('should reject field with empty label', () => {
        const field = {
          sectionId: '00000000-0000-0000-0000-000000000001',
          label: '',
          fieldType: 'text',
          isRequired: true,
          displayOrder: 1,
        };

        const result = createTemplateFieldSchema.safeParse(field);
        expect(result.success).toBe(false);
      });

      it('should reject field with label exceeding max length', () => {
        const field = {
          sectionId: '00000000-0000-0000-0000-000000000001',
          label: 'a'.repeat(256),
          fieldType: 'text',
          isRequired: true,
          displayOrder: 1,
        };

        const result = createTemplateFieldSchema.safeParse(field);
        expect(result.success).toBe(false);
      });

      it('should reject field with negative displayOrder', () => {
        const field = {
          sectionId: '00000000-0000-0000-0000-000000000001',
          label: 'Test',
          fieldType: 'text',
          isRequired: true,
          displayOrder: -1,
        };

        const result = createTemplateFieldSchema.safeParse(field);
        expect(result.success).toBe(false);
      });
    });

    describe('updateTemplateFieldSchema', () => {
      it('should validate partial field update', () => {
        const update = {
          id: '00000000-0000-0000-0000-000000000001',
          label: 'Updated Label',
        };

        const result = updateTemplateFieldSchema.safeParse(update);
        expect(result.success).toBe(true);
      });

      it('should validate full field update', () => {
        const update = {
          id: '00000000-0000-0000-0000-000000000001',
          sectionId: '00000000-0000-0000-0000-000000000002',
          label: 'Updated Label',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 2,
          defaultValue: 'New default',
        };

        const result = updateTemplateFieldSchema.safeParse(update);
        expect(result.success).toBe(true);
      });

      it('should reject update without id', () => {
        const update = {
          label: 'Updated Label',
        };

        const result = updateTemplateFieldSchema.safeParse(update);
        expect(result.success).toBe(false);
      });
    });

    describe('templateFieldSchema', () => {
      it('should validate complete template field with timestamps', () => {
        const field = {
          id: '00000000-0000-0000-0000-000000000001',
          sectionId: '00000000-0000-0000-0000-000000000002',
          label: 'Patient Name',
          fieldType: 'text',
          isRequired: true,
          displayOrder: 1,
          defaultValue: 'John Doe',
          options: null,
          validationRules: null,
          helpText: 'Enter patient name',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        const result = templateFieldSchema.safeParse(field);
        expect(result.success).toBe(true);
      });

      it('should coerce string dates to Date objects', () => {
        const field = {
          id: '00000000-0000-0000-0000-000000000001',
          sectionId: '00000000-0000-0000-0000-000000000002',
          label: 'Test',
          fieldType: 'text',
          isRequired: true,
          displayOrder: 1,
          defaultValue: null,
          options: null,
          validationRules: null,
          helpText: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        };

        const result = templateFieldSchema.safeParse(field);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.createdAt).toBeInstanceOf(Date);
          expect(result.data.updatedAt).toBeInstanceOf(Date);
        }
      });
    });
  });

  describe('Template Section Schemas', () => {
    describe('createTemplateSectionSchema', () => {
      it('should validate valid template section', () => {
        const section = {
          templateId: '00000000-0000-0000-0000-000000000001',
          name: 'Assessment',
          description: 'Clinical assessment section',
          displayOrder: 1,
          isRequired: true,
          minLength: 10,
          maxLength: 1000,
          placeholder: 'Enter assessment details',
          aiPromptHints: 'Focus on symptoms and behaviors',
        };

        const result = createTemplateSectionSchema.safeParse(section);
        expect(result.success).toBe(true);
      });

      it('should apply default values', () => {
        const section = {
          templateId: '00000000-0000-0000-0000-000000000001',
          name: 'Notes',
          displayOrder: 1,
        };

        const result = createTemplateSectionSchema.safeParse(section);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isRequired).toBe(true);
          expect(result.data.minLength).toBeNull();
          expect(result.data.maxLength).toBeNull();
        }
      });

      it('should reject section with minLength > maxLength', () => {
        const section = {
          templateId: '00000000-0000-0000-0000-000000000001',
          name: 'Assessment',
          displayOrder: 1,
          minLength: 1000,
          maxLength: 100,
        };

        const result = createTemplateSectionSchema.safeParse(section);
        expect(result.success).toBe(false);
      });

      it('should reject section with empty name', () => {
        const section = {
          templateId: '00000000-0000-0000-0000-000000000001',
          name: '',
          displayOrder: 1,
        };

        const result = createTemplateSectionSchema.safeParse(section);
        expect(result.success).toBe(false);
      });

      it('should reject section with negative displayOrder', () => {
        const section = {
          templateId: '00000000-0000-0000-0000-000000000001',
          name: 'Assessment',
          displayOrder: -1,
        };

        const result = createTemplateSectionSchema.safeParse(section);
        expect(result.success).toBe(false);
      });
    });

    describe('updateTemplateSectionSchema', () => {
      it('should validate partial section update', () => {
        const update = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Updated Name',
        };

        const result = updateTemplateSectionSchema.safeParse(update);
        expect(result.success).toBe(true);
      });

      it('should reject update without id', () => {
        const update = {
          name: 'Updated Name',
        };

        const result = updateTemplateSectionSchema.safeParse(update);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Note Template Schemas', () => {
    describe('createNoteTemplateSchema', () => {
      it('should validate valid note template', () => {
        const template = {
          name: 'Intake Assessment',
          description: 'Standard intake assessment template',
          templateType: 'intake',
          isDefault: true,
          status: 'active',
          version: 1,
        };

        const result = createNoteTemplateSchema.safeParse(template);
        expect(result.success).toBe(true);
      });

      it('should apply default values', () => {
        const template = {
          name: 'Progress Note',
          templateType: 'progress',
        };

        const result = createNoteTemplateSchema.safeParse(template);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isDefault).toBe(false);
          expect(result.data.status).toBe('draft');
          expect(result.data.version).toBe(1);
        }
      });

      it('should reject template with empty name', () => {
        const template = {
          name: '',
          templateType: 'progress',
        };

        const result = createNoteTemplateSchema.safeParse(template);
        expect(result.success).toBe(false);
      });

      it('should reject template with version < 1', () => {
        const template = {
          name: 'Test Template',
          templateType: 'progress',
          version: 0,
        };

        const result = createNoteTemplateSchema.safeParse(template);
        expect(result.success).toBe(false);
      });

      it('should reject template with invalid status', () => {
        const template = {
          name: 'Test Template',
          templateType: 'progress',
          status: 'invalid',
        };

        const result = createNoteTemplateSchema.safeParse(template);
        expect(result.success).toBe(false);
      });
    });

    describe('updateNoteTemplateSchema', () => {
      it('should validate partial template update', () => {
        const update = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Updated Name',
        };

        const result = updateNoteTemplateSchema.safeParse(update);
        expect(result.success).toBe(true);
      });

      it('should validate full template update', () => {
        const update = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Updated Name',
          description: 'Updated description',
          templateType: 'intake',
          isDefault: false,
          status: 'active',
          version: 2,
          parentTemplateId: null,
        };

        const result = updateNoteTemplateSchema.safeParse(update);
        expect(result.success).toBe(true);
      });

      it('should reject update without id', () => {
        const update = {
          name: 'Updated Name',
        };

        const result = updateNoteTemplateSchema.safeParse(update);
        expect(result.success).toBe(false);
      });
    });

    describe('noteTemplateSchema', () => {
      it('should validate complete note template with timestamps', () => {
        const template = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Intake Assessment',
          description: 'Standard intake assessment',
          templateType: 'intake',
          isDefault: true,
          status: 'active',
          version: 1,
          parentTemplateId: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        const result = noteTemplateSchema.safeParse(template);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Composite Schemas', () => {
    describe('createFullTemplateSchema', () => {
      it('should validate full template with sections and fields', () => {
        const fullTemplate = {
          template: {
            name: 'Intake Assessment',
            description: 'Complete intake assessment',
            templateType: 'intake',
            isDefault: true,
            status: 'active',
            version: 1,
          },
          sections: [
            {
              name: 'Patient Information',
              displayOrder: 1,
              isRequired: true,
              fields: [
                {
                  label: 'Full Name',
                  fieldType: 'text',
                  isRequired: true,
                  displayOrder: 1,
                },
                {
                  label: 'Age',
                  fieldType: 'number',
                  isRequired: true,
                  displayOrder: 2,
                  validationRules: { min: 0, max: 120, integer: true },
                },
              ],
            },
            {
              name: 'Assessment',
              displayOrder: 2,
              isRequired: true,
              fields: [
                {
                  label: 'Presenting Problem',
                  fieldType: 'textarea',
                  isRequired: true,
                  displayOrder: 1,
                },
              ],
            },
          ],
        };

        const result = createFullTemplateSchema.safeParse(fullTemplate);
        expect(result.success).toBe(true);
      });

      it('should validate template with empty sections array', () => {
        const fullTemplate = {
          template: {
            name: 'Simple Template',
            templateType: 'simple',
          },
          sections: [],
        };

        const result = createFullTemplateSchema.safeParse(fullTemplate);
        expect(result.success).toBe(true);
      });

      it('should validate template with sections but no fields', () => {
        const fullTemplate = {
          template: {
            name: 'Template with Sections',
            templateType: 'simple',
          },
          sections: [
            {
              name: 'Section 1',
              displayOrder: 1,
            },
          ],
        };

        const result = createFullTemplateSchema.safeParse(fullTemplate);
        expect(result.success).toBe(true);
      });
    });

    describe('cloneTemplateSchema', () => {
      it('should validate clone template request', () => {
        const cloneRequest = {
          sourceTemplateId: '00000000-0000-0000-0000-000000000001',
          newName: 'Cloned Template',
          incrementVersion: true,
        };

        const result = cloneTemplateSchema.safeParse(cloneRequest);
        expect(result.success).toBe(true);
      });

      it('should validate clone without incrementing version', () => {
        const cloneRequest = {
          sourceTemplateId: '00000000-0000-0000-0000-000000000001',
          newName: 'Cloned Template',
          incrementVersion: false,
        };

        const result = cloneTemplateSchema.safeParse(cloneRequest);
        expect(result.success).toBe(true);
      });

      it('should apply default value for incrementVersion', () => {
        const cloneRequest = {
          sourceTemplateId: '00000000-0000-0000-0000-000000000001',
          newName: 'Cloned Template',
        };

        const result = cloneTemplateSchema.safeParse(cloneRequest);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.incrementVersion).toBe(false);
        }
      });
    });

    describe('templateQuerySchema', () => {
      it('should validate query with filters', () => {
        const query = {
          status: 'active',
          templateType: 'intake',
          isDefault: true,
          includeArchived: false,
          limit: 25,
          offset: 0,
        };

        const result = templateQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
      });

      it('should validate query with only limit', () => {
        const query = {
          limit: 50,
        };

        const result = templateQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
      });

      it('should apply default values', () => {
        const result = templateQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.includeArchived).toBe(false);
          expect(result.data.limit).toBe(50);
          expect(result.data.offset).toBe(0);
        }
      });

      it('should reject limit less than 1', () => {
        const query = {
          limit: 0,
        };

        const result = templateQuerySchema.safeParse(query);
        expect(result.success).toBe(false);
      });

      it('should reject limit greater than 100', () => {
        const query = {
          limit: 101,
        };

        const result = templateQuerySchema.safeParse(query);
        expect(result.success).toBe(false);
      });

      it('should reject negative offset', () => {
        const query = {
          offset: -1,
        };

        const result = templateQuerySchema.safeParse(query);
        expect(result.success).toBe(false);
      });
    });
  });
});
