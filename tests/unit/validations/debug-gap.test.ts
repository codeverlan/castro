import { describe, it, expect } from 'vitest';
import {
  gapFieldConfigSchema,
} from '~/lib/validations/gapPrompt';

describe('Debug Gap Schema Import', () => {
  it('should import gapFieldConfigSchema', () => {
    expect(gapFieldConfigSchema).toBeDefined();
    expect(typeof gapFieldConfigSchema.safeParse).toBe('function');
  });

  it('should validate text field configuration', () => {
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
    if (!result.success) {
      console.error('Validation failed:', result.error.issues);
    }
    expect(result.success).toBe(true);
  });
});
