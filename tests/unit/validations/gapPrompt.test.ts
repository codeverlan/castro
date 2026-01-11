import { describe, it, expect } from 'vitest';
import {
  gapFieldConfigSchema,
  gapPromptSchema,
  gapResponseSchema,
  submitGapResponsesSchema,
  gapPromptUIStateSchema,
  gapFieldOptionSchema,
  gapPromptsArraySchema,
} from '~/lib/validations/gapPrompt';

describe('Gap Prompt Validations', () => {
  describe('gapFieldOptionSchema', () => {
    it('should validate a valid field option', () => {
      const option = {
        value: 'option-1',
        label: 'Option 1',
        disabled: false,
      };

      const result = gapFieldOptionSchema.safeParse(option);
      expect(result.success).toBe(true);
    });

    it('should validate option without disabled field', () => {
      const option = {
        value: 'option-1',
        label: 'Option 1',
      };

      const result = gapFieldOptionSchema.safeParse(option);
      expect(result.success).toBe(true);
    });

    it('should reject invalid option with missing value', () => {
      const option = {
        label: 'Option 1',
      };

      const result = gapFieldOptionSchema.safeParse(option);
      expect(result.success).toBe(false);
    });

    it('should reject invalid option with missing label', () => {
      const option = {
        value: 'option-1',
      };

      const result = gapFieldOptionSchema.safeParse(option);
      expect(result.success).toBe(false);
    });
  });

  describe('gapFieldConfigSchema', () => {
    it('should validate a valid text field configuration', () => {
      const config = {
        id: 'field-1',
        gapId: '00000000-0000-0000-0000-000000000001',
        fieldType: 'text',
        label: 'Patient Name',
        placeholder: 'Enter patient name',
        helpText: 'Required field',
        isRequired: true,
      };

      const result = gapFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate a valid select field with options', () => {
      const config = {
        id: 'field-2',
        gapId: '00000000-0000-0000-0000-000000000001',
        fieldType: 'select',
        label: 'Severity Level',
        isRequired: true,
        options: [
          { value: 'mild', label: 'Mild' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'severe', label: 'Severe' },
        ],
      };

      const result = gapFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate field with validation rules', () => {
      const config = {
        id: 'field-3',
        gapId: '00000000-0000-0000-0000-000000000001',
        fieldType: 'text',
        label: 'Phone Number',
        isRequired: true,
        validationRules: {
          pattern: '^[0-9]{10}$',
          patternMessage: 'Please enter a valid 10-digit phone number',
          minLength: 10,
          maxLength: 10,
        },
      };

      const result = gapFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate number field with numeric validation rules', () => {
      const config = {
        id: 'field-4',
        gapId: '00000000-0000-0000-0000-000000000001',
        fieldType: 'number',
        label: 'Age',
        isRequired: true,
        validationRules: {
          min: 0,
          max: 150,
          step: 1,
        },
        defaultValue: 30,
      };

      const result = gapFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject field with invalid gapId format', () => {
      const config = {
        id: 'field-1',
        gapId: 'not-a-uuid',
        fieldType: 'text',
        label: 'Test Field',
        isRequired: true,
      };

      const result = gapFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject field with invalid fieldType', () => {
      const config = {
        id: 'field-1',
        gapId: '00000000-0000-0000-0000-000000000001',
        fieldType: 'invalid-type',
        label: 'Test Field',
        isRequired: true,
      };

      const result = gapFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject field with missing required fields', () => {
      const config = {
        fieldType: 'text',
      };

      const result = gapFieldConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('gapPromptSchema', () => {
    it('should validate a complete gap prompt', () => {
      const prompt = {
        id: '00000000-0000-0000-0000-000000000001',
        sessionId: '00000000-0000-0000-0000-000000000002',
        sectionName: 'Assessment',
        gapDescription: 'Missing risk assessment information',
        userPrompt: 'What are the current risk factors for the client?',
        priority: 1,
        isResolved: false,
        field: {
          id: 'field-1',
          gapId: '00000000-0000-0000-0000-000000000001',
          fieldType: 'textarea',
          label: 'Risk Assessment',
          isRequired: true,
        },
      };

      const result = gapPromptSchema.safeParse(prompt);
      expect(result.success).toBe(true);
    });

    it('should validate resolved gap prompt', () => {
      const prompt = {
        id: '00000000-0000-0000-0000-000000000001',
        sessionId: '00000000-0000-0000-0000-000000000002',
        sectionName: 'Assessment',
        gapDescription: 'Missing risk assessment',
        userPrompt: 'What are the current risk factors?',
        priority: 1,
        isResolved: true,
        field: {
          id: 'field-1',
          gapId: '00000000-0000-0000-0000-000000000001',
          fieldType: 'textarea',
          label: 'Risk Assessment',
          isRequired: true,
        },
      };

      const result = gapPromptSchema.safeParse(prompt);
      expect(result.success).toBe(true);
    });

    it('should reject gap prompt with invalid UUID for sessionId', () => {
      const prompt = {
        id: '00000000-0000-0000-0000-000000000001',
        sessionId: 'invalid-uuid',
        sectionName: 'Assessment',
        gapDescription: 'Missing risk assessment',
        userPrompt: 'What are the risk factors?',
        priority: 1,
        isResolved: false,
        field: {
          id: 'field-1',
          gapId: '00000000-0000-0000-0000-000000000001',
          fieldType: 'textarea',
          label: 'Risk Assessment',
          isRequired: true,
        },
      };

      const result = gapPromptSchema.safeParse(prompt);
      expect(result.success).toBe(false);
    });

    it('should reject gap prompt with negative priority', () => {
      const prompt = {
        id: '00000000-0000-0000-0000-000000000001',
        sessionId: '00000000-0000-0000-0000-000000000002',
        sectionName: 'Assessment',
        gapDescription: 'Missing risk assessment',
        userPrompt: 'What are the risk factors?',
        priority: -1,
        isResolved: false,
        field: {
          id: 'field-1',
          gapId: '00000000-0000-0000-0000-000000000001',
          fieldType: 'textarea',
          label: 'Risk Assessment',
          isRequired: true,
        },
      };

      const result = gapPromptSchema.safeParse(prompt);
      expect(result.success).toBe(false);
    });
  });

  describe('gapResponseSchema', () => {
    it('should validate string response', () => {
      const response = {
        gapId: '00000000-0000-0000-0000-000000000001',
        value: 'Patient reports severe anxiety',
      };

      const result = gapResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate array response (multiselect)', () => {
      const response = {
        gapId: '00000000-0000-0000-0000-000000000001',
        value: ['anxiety', 'depression', 'insomnia'],
      };

      const result = gapResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate boolean response (checkbox)', () => {
      const response = {
        gapId: '00000000-0000-0000-0000-000000000001',
        value: true,
      };

      const result = gapResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate null response', () => {
      const response = {
        gapId: '00000000-0000-0000-0000-000000000001',
        value: null,
      };

      const result = gapResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('submitGapResponsesSchema', () => {
    it('should validate valid gap responses submission', () => {
      const submission = {
        sessionId: '00000000-0000-0000-0000-000000000001',
        responses: [
          {
            gapId: '00000000-0000-0000-0000-000000000002',
            value: 'Yes, patient is at risk',
          },
          {
            gapId: '00000000-0000-0000-0000-000000000003',
            value: ['medication', 'therapy'],
          },
          {
            gapId: '00000000-0000-0000-0000-000000000004',
            value: true,
          },
        ],
      };

      const result = submitGapResponsesSchema.safeParse(submission);
      expect(result.success).toBe(true);
    });

    it('should validate empty responses array', () => {
      const submission = {
        sessionId: '00000000-0000-0000-0000-000000000001',
        responses: [],
      };

      const result = submitGapResponsesSchema.safeParse(submission);
      expect(result.success).toBe(true);
    });

    it('should reject submission with invalid sessionId', () => {
      const submission = {
        sessionId: 'not-a-uuid',
        responses: [
          {
            gapId: '00000000-0000-0000-0000-000000000002',
            value: 'Test response',
          },
        ],
      };

      const result = submitGapResponsesSchema.safeParse(submission);
      expect(result.success).toBe(false);
    });
  });

  describe('gapPromptUIStateSchema', () => {
    it('should validate valid UI state', () => {
      const state = {
        currentGapIndex: 0,
        gaps: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            sessionId: '00000000-0000-0000-0000-000000000002',
            sectionName: 'Assessment',
            gapDescription: 'Missing risk assessment',
            userPrompt: 'What are the risk factors?',
            priority: 1,
            isResolved: false,
            field: {
              id: 'field-1',
              gapId: '00000000-0000-0000-0000-000000000001',
              fieldType: 'textarea',
              label: 'Risk Assessment',
              isRequired: true,
            },
          },
        ],
        responses: {
          '00000000-0000-0000-0000-000000000001': 'Patient reports high anxiety',
        },
        isSubmitting: false,
        errors: {},
      };

      const result = gapPromptUIStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should validate state with errors', () => {
      const state = {
        currentGapIndex: 0,
        gaps: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            sessionId: '00000000-0000-0000-0000-000000000002',
            sectionName: 'Assessment',
            gapDescription: 'Missing risk assessment',
            userPrompt: 'What are the risk factors?',
            priority: 1,
            isResolved: false,
            field: {
              id: 'field-1',
              gapId: '00000000-0000-0000-0000-000000000001',
              fieldType: 'textarea',
              label: 'Risk Assessment',
              isRequired: true,
            },
          },
        ],
        responses: {},
        isSubmitting: true,
        errors: {
          '00000000-0000-0000-0000-000000000001': 'This field is required',
        },
      };

      const result = gapPromptUIStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should reject state with negative index', () => {
      const state = {
        currentGapIndex: -1,
        gaps: [],
        responses: {},
        isSubmitting: false,
        errors: {},
      };

      const result = gapPromptUIStateSchema.safeParse(state);
      expect(result.success).toBe(false);
    });
  });

  describe('gapPromptsArraySchema', () => {
    it('should validate array of gap prompts', () => {
      const prompts = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          sessionId: '00000000-0000-0000-0000-000000000002',
          sectionName: 'Assessment',
          gapDescription: 'Missing risk assessment',
          userPrompt: 'What are the risk factors?',
          priority: 1,
          isResolved: false,
          field: {
            id: 'field-1',
            gapId: '00000000-0000-0000-0000-000000000001',
            fieldType: 'textarea',
            label: 'Risk Assessment',
            isRequired: true,
          },
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          sessionId: '00000000-0000-0000-0000-000000000002',
          sectionName: 'Treatment Plan',
          gapDescription: 'Missing treatment goals',
          userPrompt: 'What are the treatment goals?',
          priority: 2,
          isResolved: false,
          field: {
            id: 'field-2',
            gapId: '00000000-0000-0000-0000-000000000003',
            fieldType: 'textarea',
            label: 'Treatment Goals',
            isRequired: true,
          },
        },
      ];

      const result = gapPromptsArraySchema.safeParse(prompts);
      expect(result.success).toBe(true);
    });

    it('should validate empty array', () => {
      const result = gapPromptsArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('should reject array with invalid prompt', () => {
      const prompts = [
        {
          id: 'not-a-uuid',
          sessionId: 'not-a-uuid',
          sectionName: 'Assessment',
          gapDescription: 'Missing assessment',
          userPrompt: 'What is the assessment?',
          priority: 1,
          isResolved: false,
          field: {
            id: 'field-1',
            gapId: 'not-a-uuid',
            fieldType: 'textarea',
            label: 'Assessment',
            isRequired: true,
          },
        },
      ];

      const result = gapPromptsArraySchema.safeParse(prompts);
      expect(result.success).toBe(false);
    });
  });
});
