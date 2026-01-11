# Validation Schema Export Map

## Generated: 2025-01-17

## Step 1: Check actual exports from validation modules

```bash
# Gap Prompt Validation
cat src/validations/gapPrompt.ts | grep -E "^export"

# Note Templates Validation
cat src/validations/noteTemplates.ts | grep -E "^export"
```

## Step 2: Compare with test imports

```bash
# What gapPrompt tests import
grep "import" tests/unit/validations/gapPrompt.test.ts | grep -v "vitest\|@/"

# What noteTemplates tests import
grep "import" tests/unit/validations/noteTemplates.test.ts | grep -v "vitest\|@/"
```

## Step 3: Find missing schemas

The tests expect these schemas (based on test usage):

### Gap Prompt Tests Need:
- `gapFieldOptionSchema`
- `gapFieldConfigSchema`
- `gapPromptSchema`
- `gapResponseSchema`
- `submitGapResponsesSchema`
- `gapPromptUIStateSchema`
- `gapPromptsArraySchema`

### Note Template Tests Need:
- `fieldTypeSchema`
- `templateStatusSchema`
- `textValidationRulesSchema`
- `numberValidationRulesSchema`
- `dateValidationRulesSchema`
- `fieldOptionSchema`
- `createTemplateFieldSchema`
- `updateTemplateFieldSchema`
- `templateFieldSchema`
- `createTemplateSectionSchema`
- `updateTemplateSectionSchema`
- `templateSectionSchema`
- `createNoteTemplateSchema`
- `updateNoteTemplateSchema`
- `noteTemplateSchema`
- `cloneTemplateSchema`
- `queryNoteTemplatesSchema`

## Step 4: Compare and identify gaps

After running the above commands, create a comparison table.

## Step 5: Fix mismatch

Either:
A. Rename exports in validation files to match test expectations
B. Update test imports to match actual exports
C. Create missing schemas in validation files
