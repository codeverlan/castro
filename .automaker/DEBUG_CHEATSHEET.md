# 🚀 Debug Cheatsheet - Quick Commands

## Run Specific Tests

```bash
# Individual files
npm test -- tests/unit/services/fileWatcher.test.ts
npm test -- tests/unit/validations/gapPrompt.test.ts
npm test -- tests/unit/validations/noteTemplates.test.ts
npm test -- tests/unit/services/contentMapping.test.ts
npm test -- tests/unit/services/gapDetection.test.ts
npm test -- tests/unit/lib/utils.test.ts

# Multiple files
npm test -- tests/unit/services/
npm test -- tests/unit/validations/

# Single test
npm test -- -t "should start the file watcher successfully"

# With line numbers
npm test -- tests/unit/services/fileWatcher.test.ts --reporter=verbose
```

## Check Exports vs Imports

```bash
# What's exported from validation files
cat src/validations/gapPrompt.ts | grep -E "^export"
cat src/validations/noteTemplates.ts | grep -E "^export"

# What tests import
head -30 tests/unit/validations/gapPrompt.test.ts | grep "import"
head -30 tests/unit/validations/noteTemplates.test.ts | grep "import"

# Find schema usage in tests
grep -n "gapFieldConfigSchema\." tests/unit/validations/gapPrompt.test.ts
grep -n "createTemplateFieldSchema\." tests/unit/validations/noteTemplates.test.ts
```

## Examine Test Code

```bash
# View specific failing test (with line numbers)
sed -n '60,90p' tests/unit/validations/gapPrompt.test.ts

# View test structure
sed -n '1,100p' tests/unit/services/contentMapping.test.ts

# Search for variable definitions
grep -n "const mockRequest\|let mockRequest" tests/unit/services/contentMapping.test.ts

# Search for mock setup
grep -n "mockOllamaService.generate" tests/unit/services/gapDetection.test.ts
```

## Check Source Code

```bash
# Find how fs is imported
cat src/services/fileWatcher/index.ts | head -50 | grep -n "import.*fs"

# Find schema definitions
grep -n "Schema\|schema" src/validations/gapPrompt.ts | grep "z\.object\|z\.array"

# Find performance.now() usage
grep -n "performance\.now()" src/services/gapDetection/engine.ts

# Find metric tracking
grep -n "llmAnalysisTimeMs" src/services/gapDetection/engine.ts
```

## Debug Mode

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run with debug output
npm test -- --debug

# Run only failed tests
npm test -- --reporter=basic

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Quick Fixes

### File Watcher Mock

```typescript
// Correct mock setup
import * as fsPromises from 'fs/promises';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  stat: vi.fn(),
}));

const mockFs = vi.mocked(fsPromises);

beforeEach(() => {
  mockFs.mkdir.mockResolvedValue(undefined);
  mockFs.stat.mockResolvedValue({
    isFile: () => true,
    size: 1024,
    mtime: new Date(),
  } as any);
});
```

### Performance Mock for Metrics

```typescript
beforeAll(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
});

beforeEach(() => {
  let currentTime = Date.now();
  (performance.now as any).mockImplementation(() => currentTime);
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

### Move Mock to Higher Scope

```typescript
describe('Suite', () => {
  let mockRequest: RequestType;

  beforeEach(() => {
    mockRequest = { /* ... */ };
  });

  describe('Sub-suite', () => {
    // Can access mockRequest here
  });
});
```

## Progress Tracking

```bash
# Count failures per file
npm test 2>&1 | grep "❯" | awk '{print $2, $4}'

# Get summary
npm test 2>&1 | grep -E "Test Files|Tests"

# Watch progress
watch -n 5 'npm test 2>&1 | grep -E "PASS|FAIL"'
```

## Git Workflow

```bash
# Create debug branch
git checkout -b debug/test-fixes

# Commit each fix
git add .
git commit -m "fix: file watcher mock setup"

# Push progress
git push origin debug/test-fixes

# Create PR when done
gh pr create --title "Fix test failures" --body "Fixed 89 test failures"
```
