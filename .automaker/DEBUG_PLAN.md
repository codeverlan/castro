# 🔍 Comprehensive Debug Plan for Failed Tests

**Generated:** 2025-01-17
**Total Failures:** 89 out of 192 tests
**Pass Rate:** 53.6%

---

## 📑 Table of Contents

1. [Quick Reference Command List](#quick-reference-command-list)
2. [Priority 1: File Watcher Mock Setup (40 failures)](#priority-1-file-watcher-mock-setup)
3. [Priority 2: Validation Schema Exports (31 failures)](#priority-2-validation-schema-exports)
4. [Priority 3: Content Mapping Mock Issues (10 failures)](#priority-3-content-mapping-mock-issues)
5. [Priority 4: Gap Detection Metrics (2 failures)](#priority-4-gap-detection-metrics)
6. [Priority 5: Utils Test Expectations (6 failures)](#priority-5-utils-test-expectations)
7. [Verification Checklists](#verification-checklists)

---

## 🚀 Quick Reference Command List

```bash
# === Run specific test files ===
npm test -- tests/unit/services/fileWatcher.test.ts
npm test -- tests/unit/validations/gapPrompt.test.ts
npm test -- tests/unit/validations/noteTemplates.test.ts
npm test -- tests/unit/services/contentMapping.test.ts
npm test -- tests/unit/services/gapDetection.test.ts
npm test -- tests/unit/lib/utils.test.ts

# === Run with verbose output ===
npm test -- --reporter=verbose

# === Run with debug output ===
npm test -- --debug

# === Check what's exported from modules ===
cat src/validations/gapPrompt.ts | grep -E "^export"
cat src/validations/noteTemplates.ts | grep -E "^export"

# === Check test imports ===
head -30 tests/unit/validations/gapPrompt.test.ts | grep "import"
head -30 tests/unit/validations/noteTemplates.test.ts | grep "import"

# === Find specific schema usage ===
grep -n "gapFieldConfigSchema\." tests/unit/validations/gapPrompt.test.ts
grep -n "createTemplateFieldSchema\." tests/unit/validations/noteTemplates.test.ts
```

---

## 🟥 PRIORITY 1: File Watcher Mock Setup (40 failures)

### Status: 🔴 CRITICAL - Blocking all file watcher tests

### Error Pattern
```
TypeError: mockFs.mkdir.mockResolvedValue is not a function
```

### Root Cause Analysis
The `fs/promises` module is not being mocked correctly. All 40 tests fail at the same point where `mockFs.mkdir.mockResolvedValue()` is called.

### Investigation Steps

#### Step 1: Examine how fs is imported in file watcher
```bash
# Check imports in the actual service
cat src/services/fileWatcher/index.ts | head -50 | grep -n "import.*fs"

# Expected output will show either:
# - import * as fs from 'fs'
# - import { promises as fsPromises } from 'fs'
# - import * as fsPromises from 'fs/promises'
```

#### Step 2: Check the mock setup in tests
```bash
# View the mock setup
head -100 tests/unit/services/fileWatcher.test.ts

# Look for these patterns:
# - vi.mock('fs/promises', ...)
# - vi.mock('fs', ...)
# - const mockFs = vi.mocked(...)
```

#### Step 3: Identify the issue
The issue is likely one of these:

**Issue A:** Mocking the wrong module
```typescript
// ❌ WRONG - Code uses fs/promises but mock is for fs
vi.mock('fs', () => ({ promises: {...} }))

// ✅ CORRECT
vi.mock('fs/promises', () => ({...}))
```

**Issue B:** Incorrect mock syntax
```typescript
// ❌ WRONG - Not using vi.mocked() properly
const mockFs = vi.mocked(fs/promises)

// ✅ CORRECT
import * as fsPromises from 'fs/promises'
vi.mock('fs/promises')
const mockFs = vi.mocked(fsPromises)
```

**Issue C:** Mock not returning functions
```typescript
// ❌ WRONG - mockResolvedValue not available
vi.mock('fs/promises', () => ({
  mkdir: undefined,
}))

// ✅ CORRECT
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  stat: vi.fn(),
}))
```

#### Step 4: Proposed Fix

**Option 1: Direct mock with vi.fn()**
```typescript
import * as fsPromises from 'fs/promises';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

const mockFs = vi.mocked(fsPromises);

describe('FileWatcherService', () => {
  beforeEach(() => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({
      isFile: () => true,
      size: 1024,
      mtime: new Date(),
    } as any);
    // ... rest of setup
  });
});
```

**Option 2: Use vi.stubGlobal (alternative)**
```typescript
vi.stubGlobal('fs', {
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({...}),
  }
});
```

#### Step 5: Test the fix
```bash
# Run file watcher tests only
npm test -- tests/unit/services/fileWatcher.test.ts

# Expected: Should see more specific errors if mock is fixed,
# or some tests may start passing
```

#### Step 6: Verify with debug output
```bash
# Add console.log to see what mockFs actually is
npm test -- tests/unit/services/fileWatcher.test.ts -- --reporter=verbose
```

---

## 🟡 PRIORITY 2: Validation Schema Exports (31 failures)

### Status: 🟡 HIGH - Most validation tests failing

### Error Pattern
```typescript
expect(result.success).toBe(true);
// AssertionError: expected false to be true
```

### Root Cause Analysis
All validation tests fail because `schema.safeParse()` returns `success: false`. This means:
- The schemas being imported may not exist
- The schemas have different names
- The schemas don't accept the test data

### Investigation Steps

#### Step 1: Map what's exported vs what's imported

```bash
# === Create export inventory ===

# Gap Prompt validation exports
echo "=== GAP PROMPT EXPORTS ===" > /tmp/validation_exports.txt
cat src/validations/gapPrompt.ts | grep -E "^export (const|function|type|interface)" >> /tmp/validation_exports.txt

# Note Templates validation exports
echo -e "\n=== NOTE TEMPLATES EXPORTS ===" >> /tmp/validation_exports.txt
cat src/validations/noteTemplates.ts | grep -E "^export (const|function|type|interface)" >> /tmp/validation_exports.txt

# View the results
cat /tmp/validation_exports.txt
```

#### Step 2: Map what tests import

```bash
# Gap Prompt test imports
echo "=== GAP PROMPT TEST IMPORTS ===" > /tmp/test_imports.txt
grep -h "^import.*from.*@/validations" tests/unit/validations/gapPrompt.test.ts >> /tmp/test_imports.txt

# Note Templates test imports
echo -e "\n=== NOTE TEMPLATES TEST IMPORTS ===" >> /tmp/test_imports.txt
grep -h "^import.*from.*@/validations" tests/unit/validations/noteTemplates.test.ts >> /tmp/test_imports.txt

# View the results
cat /tmp/test_imports.txt
```

#### Step 3: Compare and identify gaps

```bash
# Side-by-side comparison
echo "=== EXPORTED vs IMPORTED ==="
paste /tmp/validation_exports.txt /tmp/test_imports.txt
```

#### Step 4: Identify missing schemas

Based on test failures, these schemas are needed but may not exist:

**Gap Prompt Missing:**
- `gapFieldConfigSchema`
- `gapResponseSchema`
- `gapPromptUIStateSchema`
- `gapPromptsArraySchema`

**Note Templates Missing:**
- `createTemplateFieldSchema`
- `updateTemplateFieldSchema`
- `createTemplateSectionSchema`
- `updateTemplateSectionSchema`
- `cloneTemplateSchema`
- `queryNoteTemplatesSchema`

#### Step 5: Check if schemas exist with different names

```bash
# Search for schema definitions
grep -n "Schema\|schema" src/validations/gapPrompt.ts | grep "z\.object\|z\.array\|z\.enum"
grep -n "Schema\|schema" src/validations/noteTemplates.ts | grep "z\.object\|z\.array\|z\.enum"
```

#### Step 6: Check test data for schema requirements

```bash
# Look at a failing test to see what data structure is expected
sed -n '60,90p' tests/unit/validations/gapPrompt.test.ts
```

#### Step 7: Proposed Fixes

**Fix A: Rename existing exports (if they exist with different names)**

Edit the validation files to export with expected names:

```typescript
// src/validations/gapPrompt.ts
// Change from:
export const fieldConfig = z.object({...});

// To:
export const gapFieldConfigSchema = z.object({...});
```

**Fix B: Create missing schemas**

```typescript
// src/validations/gapPrompt.ts
export const gapFieldConfigSchema = z.object({
  gapId: z.string().uuid(),
  fieldType: z.enum(['text', 'textarea', 'select', 'multiselect', 'checkbox', 'number', 'date']),
  label: z.string().min(1).max(200),
  placeholder: z.string().optional(),
  options: z.array(gapFieldOptionSchema).optional(),
  validation: z.any().optional(),
  isRequired: z.boolean().optional().default(false),
  defaultValue: z.any().optional(),
});

export const gapResponseSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.boolean(),
  z.number(),
  z.null(),
]);

export const gapPromptUIStateSchema = z.object({
  currentIndex: z.number().int().min(0).optional(),
  responses: z.record(gapResponseSchema),
  errors: z.record(z.string()),
  isSubmitting: z.boolean().optional().default(false),
});

export const gapPromptsArraySchema = z.array(gapPromptSchema);
```

**Fix C: Update test imports to match existing exports**

```typescript
// tests/unit/validations/gapPrompt.test.ts
// Change from:
import { gapFieldConfigSchema } from '@/validations/gapPrompt';

// To match actual exports:
import { fieldConfig as gapFieldConfigSchema } from '@/validations/gapPrompt';
```

#### Step 8: Test the fix
```bash
# Run validation tests
npm test -- tests/unit/validations/gapPrompt.test.ts tests/unit/validations/noteTemplates.test.ts
```

---

## 🟠 PRIORITY 3: Content Mapping Mock Issues (10 failures)

### Status: 🟠 MEDIUM - Mock scope and response issues

### Error Patterns

1. `ReferenceError: mockRequest is not defined` (5 tests)
2. `AssertionError: expected '' to be 'Patient has anxiety'`
3. `AssertionError: expected true to be false` (should fail but passes)
4. `AssertionError: expected 0 to be greater than 0` (metrics)

### Investigation Steps

#### Step 1: Find mockRequest scope issue

```bash
# Search for where mockRequest is defined
grep -n "const mockRequest\|let mockRequest" tests/unit/services/contentMapping.test.ts

# Search for where it's used
grep -n "mockRequest" tests/unit/services/contentMapping.test.ts
```

#### Step 2: Check test suite structure

```bash
# Look at the test file structure to see nesting
sed -n '1,100p' tests/unit/services/contentMapping.test.ts
```

The issue is likely that `mockRequest` is defined in a `describe` block but referenced in another nested `describe` block.

#### Step 3: Examine failing test lines

```bash
# Line 447 - mockRequest is not defined
sed -n '430,460p' tests/unit/services/contentMapping.test.ts

# Line 490 - mockRequest is not defined
sed -n '470,500p' tests/unit/services/contentMapping.test.ts

# Line 547 - mockRequest is not defined
sed -n '530,560p' tests/unit/services/contentMapping.test.ts

# Line 583 - mockRequest is not defined
sed -n '560,590p' tests/unit/services/contentMapping.test.ts

# Line 633 - mockRequest is not defined
sed -n '620,650p' tests/unit/services/contentMapping.test.ts
```

#### Step 4: Check LLM mock responses

```bash
# Look at how mockOllamaService.generate is set up
grep -n "mockOllamaService.generate" tests/unit/services/contentMapping.test.ts | head -20
```

#### Step 5: Analyze specific test failures

**Failure 1: Rewriting disabled test**
```typescript
// Test expects processedContent to equal rawContent when rewriting is disabled
expect(result.mappedSections[0].processedContent).toBe(
  result.mappedSections[0].rawContent
);
// But gets empty string ''
```

**Likely cause:** When rewriting is disabled, the engine doesn't copy rawContent to processedContent.

**Failure 2: Clinical context extraction handling**
```typescript
// Test expects result.success to be false when extraction fails
expect(result.success).toBe(false);
// But gets true
```

**Likely cause:** The engine continues successfully even when context extraction fails (graceful degradation), but test expects failure.

**Failure 3: Metrics not tracking**
```typescript
// Test expects totalProcessingTimeMs to be > 0
expect(result.metrics!.totalProcessingTimeMs).toBeGreaterThan(0);
// But gets 0
```

**Likely cause:** `performance.now()` not being called or mocked properly.

#### Step 6: Proposed Fixes

**Fix A: Move mockRequest to higher scope**

```typescript
// Move mockRequest to top-level describe block
describe('ContentMappingEngine', () => {
  let mockRequest: ContentMappingEngineRequest;

  beforeEach(() => {
    mockRequest = {
      sessionId: 'test-session-id',
      transcription: 'Patient has anxiety',
      patientContext: {...},
      template: {...},
    };
    // ...
  });

  describe('mapContent', () => {
    // All tests can now access mockRequest
  });

  describe('edge cases and error handling', () => {
    // These tests can now also access mockRequest
  });
});
```

**Fix B: Adjust test expectations for graceful degradation**

```typescript
// Instead of expecting failure, expect success with warning
it('should handle clinical context extraction failure gracefully', async () => {
  mockOllamaService.generate.mockResolvedValueOnce('invalid json');

  const result = await engine.mapContent(mockRequest);

  // Engine should still succeed, just without context
  expect(result.success).toBe(true);
  expect(result.clinicalContext).toEqual({
    conditions: [],
    medications: [],
    allergies: [],
    procedures: [],
  });
  expect(mockOllamaService.generate).toHaveBeenCalledTimes(1); // Only section mapping
});
```

**Fix C: Mock performance.now() for metrics**

```typescript
// Add to test setup
beforeAll(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => 100);
});

beforeEach(() => {
  // Reset and set different values to simulate time passing
  (performance.now as any).mockReturnValueOnce(100);
  (performance.now as any).mockReturnValueOnce(150); // 50ms elapsed
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

#### Step 7: Test the fix
```bash
# Run content mapping tests
npm test -- tests/unit/services/contentMapping.test.ts
```

---

## 🟢 PRIORITY 4: Gap Detection Metrics (2 failures)

### Status: 🟢 LOW - Metrics tracking issue

### Error Pattern
```typescript
expect(result.metrics?.llmAnalysisTimeMs).toBeGreaterThan(0);
// AssertionError: expected 0 to be greater than 0
```

### Root Cause
Same as Content Mapping - `performance.now()` not being called or mocked, so timing metrics return 0.

### Investigation Steps

#### Step 1: Check if metrics are being captured
```bash
# Search for where llmAnalysisTimeMs is set
grep -n "llmAnalysisTimeMs" src/services/gapDetection/engine.ts
```

#### Step 2: Check timing code
```bash
# Look for performance.now() usage in gap detection
grep -n "performance\.now()" src/services/gapDetection/engine.ts
```

#### Step 3: Check test mock setup
```bash
# Look at how ollama service is mocked
grep -n "mockOllamaService.generate" tests/unit/services/gapDetection.test.ts
```

### Proposed Fix

**Mock performance.now() for timing:**

```typescript
// tests/unit/services/gapDetection.test.ts

beforeAll(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
});

beforeEach(() => {
  vi.clearAllMocks();

  // Reset to base time
  let currentTime = Date.now();
  (performance.now as any).mockImplementation(() => currentTime);

  // Mock LLM service with timing simulation
  mockOllamaService.generate.mockImplementation(async () => {
    currentTime += 100; // Simulate 100ms processing time
    return JSON.stringify({...});
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

### Test the fix
```bash
npm test -- tests/unit/services/gapDetection.test.ts
```

---

## 🔵 PRIORITY 5: Utils Test Expectations (6 failures)

### Status: 🔵 LOW - Test expectations don't match actual behavior

### Error Patterns

1. Class order different than expected
2. Duplicate classes not being removed
3. Disabled states not being removed

### Root Cause
The `cn()` utility function uses `clsx` + `tailwind-merge` which has specific behavior for:
- Class ordering (may not preserve exact order)
- Deduplication (only for Tailwind classes, not arbitrary classes)
- Conflict resolution (later classes win)

### Investigation Steps

#### Step 1: Test actual cn() behavior
```bash
# Create a test file to experiment
cat > /tmp/test-cn.ts << 'EOF'
import { cn } from './src/lib/utils';

console.log('Test 1:', cn('bg-red-500 hover:bg-red-600', 'bg-blue-500'));
console.log('Test 2:', cn('p-4', 'p-8', 'text-sm', 'text-lg', 'm-2'));
console.log('Test 3:', cn('foo', 'foo', 'bar'));
console.log('Test 4:', cn('opacity-50', 'disabled:opacity-100'));
console.log('Test 5:', cn('flex space-y-2', 'flex-row space-x-4'));
EOF

# Run with ts-node or similar
npx ts-node /tmp/test-cn.ts
```

#### Step 2: Check tailwind-merge documentation
```bash
# tailwind-merge behavior:
# - Conflicting Tailwind classes: later class wins
# - Non-Tailwind classes: both included
# - Order: not guaranteed to be preserved
# - Deduplication: only for exact Tailwind matches
```

#### Step 3: Analyze each failing test

**Test 1: Complex Tailwind conflicts**
```typescript
// Test expects: 'bg-blue-500 hover:bg-red-600'
// Actual: 'hover:bg-red-600 bg-blue-500'

// tailwind-merge doesn't reorder classes
// The test expectation is wrong - should accept either order
expect(result).toContain('bg-blue-500');
expect(result).toContain('hover:bg-red-600');
```

**Test 2: Multiple conflicts**
```typescript
// Test expects: 'p-8 m-2 text-lg'
// Actual: 'p-8 text-lg m-2'

// Order is different but both classes present
// Use .toContain() instead of .toBe()
```

**Test 3: Duplicates**
```typescript
// Test expects: 'foo bar' (duplicates removed)
// Actual: 'foo foo bar'

// 'foo' is NOT a Tailwind class, so tailwind-merge doesn't deduplicate it
// clsx doesn't deduplicate either
// Either:
// 1. Accept that duplicates are kept, OR
// 2. Update cn() to deduplicate manually
```

**Test 4: Multiple modifiers**
```typescript
// Test expects: 'dark:hover:focus:ring-blue-600 hover:focus:ring-2'
// Actual: 'hover:focus:ring-2 hover:focus:ring-blue-500 dark:hover:focus:ring-blue-600'

// Order issue again + 'ring-blue-500' not removed
// test expectation is too strict
```

**Test 5: Real-world disabled classes**
```typescript
// Test expects 'disabled:opacity-50' to NOT be present
// But it IS present in the result

// 'disabled:opacity-50' is a valid Tailwind class
// The test assumes it should be removed based on some logic
// Need to check what logic should actually remove it
```

**Test 6: Spacing conflicts**
```typescript
// Test expects: 'flex flex-row space-x-4'
// Actual: 'flex space-y-2 flex-row space-x-4'

// space-y-2 is still present
// tailwind-merge should handle this, but maybe space-y and space-x
// are not considered conflicting?
```

### Proposed Fixes

**Fix A: Update tests to check for presence instead of exact match**

```typescript
// ❌ TOO STRICT
expect(result).toBe('bg-blue-500 hover:bg-red-600');

// ✅ FLEXIBLE
expect(result).toContain('bg-blue-500');
expect(result).toContain('hover:bg-red-600');

// Or check order-insensitive
expect(result.split(' ').sort()).toEqual(
  'bg-blue-500 hover:bg-red-600'.split(' ').sort()
);
```

**Fix B: Add manual deduplication to cn()**

```typescript
// src/lib/utils.ts
export function cn(...inputs: ClassValue[]) {
  const merged = twMerge(clsx(inputs));

  // Deduplicate non-Tailwind classes
  const classes = merged.split(' ');
  const uniqueClasses = [...new Set(classes)];

  return uniqueClasses.join(' ');
}
```

**Fix C: Understand and fix specific conflict logic**

```typescript
// For the space-y/space-x issue, check if they should conflict
// They are for different axes, so they should NOT conflict
// The test expectation is wrong - both should be present
```

### Test the fix
```bash
npm test -- tests/unit/lib/utils.test.ts
```

---

## ✅ Verification Checklists

### After Each Fix

- [ ] Run the specific test file
- [ ] Check that failures are reduced
- [ ] Ensure no new failures are introduced
- [ ] Review error messages for clarity

### Before Moving to Next Priority

- [ ] All tests in this priority are passing
- [ ] Related code still works as expected
- [ ] No console errors or warnings
- [ ] Document what was changed and why

### Final Verification

```bash
# Run all tests
npm test

# Check for coverage
npm run test:coverage

# Verify specific files:
# [ ] fileWatcher.test.ts - 40 tests passing
# [ ] gapPrompt.test.ts - 28 tests passing
# [ ] noteTemplates.test.ts - 59 tests passing
# [ ] contentMapping.test.ts - 18 tests passing
# [ ] gapDetection.test.ts - 20 tests passing
# [ ] utils.test.ts - 27 tests passing
```

---

## 📊 Progress Tracking

| Priority | Category | Failures | Status |
|----------|----------|----------|--------|
| 1 | File Watcher Mock | 40 | 🔴 Not Started |
| 2 | Validation Exports | 31 | 🔴 Not Started |
| 3 | Content Mapping | 10 | 🔴 Not Started |
| 4 | Gap Detection Metrics | 2 | 🔴 Not Started |
| 5 | Utils Expectations | 6 | 🔴 Not Started |
| | **TOTAL** | **89** | **0% Fixed** |

---

## 📝 Notes

- All fixes should be incremental - fix one thing, verify, then move to the next
- Keep the original test logic intact when possible - prefer adjusting mocks/imports over changing test expectations
- Document why changes were made for future reference
- Consider creating helper functions for common mock setups

---

## 🔗 Related Files

- Test files: `tests/unit/**/*.test.ts`
- Source files: `src/**/*.ts`
- Validation modules: `src/validations/*.ts`
- Mock helpers: Consider creating `tests/helpers/mocks.ts` for shared mocks
