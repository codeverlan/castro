# Testing Progress Tracking Guide

## Quick Reference

### View Kanban Board
```bash
cat .automaker/TESTING_KANBOARD.md
```

### Run Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Launch Vitest UI
npm run test:ui
```

### View Individual Test Suites

| Suite | File | Tests | Command |
|-------|------|-------|---------|
| Gap Prompt Validation | `tests/unit/validations/gapPrompt.test.ts` | 28 | `vitest gapPrompt.test.ts` |
| Note Templates Validation | `tests/unit/validations/noteTemplates.test.ts` | 59 | `vitest noteTemplates.test.ts` |
| Utility Functions | `tests/unit/lib/utils.test.ts` | 27 | `vitest utils.test.ts` |
| Gap Detection Service | `tests/unit/services/gapDetection.test.ts` | ~20 | `vitest gapDetection.test.ts` |
| Content Mapping Service | `tests/unit/services/contentMapping.test.ts` | ~25 | `vitest contentMapping.test.ts` |
| File Watcher Service | `tests/unit/services/fileWatcher.test.ts` | ~30 | `vitest fileWatcher.test.ts` |

### Feature Status

Check individual feature status:
```bash
# Example:
cat .automaker/features/test-infrastructure/agent-output.md
cat .automaker/features/test-gap-prompt-validation/agent-output.md
```

### Update Feature Status

To update a feature's status, use the update mechanism:

1. **To complete a feature**:
   - Mark all tasks in agent-output.md as ✅
   - Update status in feature.json to "verified"
   - Add completedAt timestamp

2. **To block a feature**:
   - Update status in feature.json to "blocked"
   - Document blockers in agent-output.md

3. **To mark as failed**:
   - Update status in feature.json to "failed"
   - Document errors in agent-output.md

## Kanban Workflow

### 🔄 In Progress → ✅ Completed
When all tests in a suite pass:
1. Run `npm test` to verify
2. Check coverage with `npm run test:coverage`
3. Update feature status to "completed"
4. Move to completed in Kanban board

### ⏳ Pending → 🔄 In Progress
When starting a new test suite:
1. Create test file
2. Write test cases
3. Update feature status to "in-progress"
4. Update Kanban board

### 🟡 In Progress → 🔵 Blocked
If tests can't be completed due to:
- Missing implementation
- External dependency issues
- Technical blockers

1. Document the blocker
2. Update status to "blocked"
3. Note in agent-output.md

## Coverage Tracking

### View Coverage Report
```bash
npm run test:coverage
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Coverage Targets
- **Functions**: 80%
- **Lines**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Improving Coverage
1. Run coverage report
2. Identify low-coverage files
3. Add tests for uncovered paths
4. Focus on critical business logic
5. Re-run coverage to verify

## Quick Commands

```bash
# Run specific test file
vitest tests/unit/lib/utils.test.ts

# Run tests matching pattern
vitest --run "validation"

# Run tests with coverage for specific file
vitest --run --coverage utils.test.ts

# Debug specific test
vitest --inspect-brk tests/unit/lib/utils.test.ts

# Update snapshots
vitest -u
```

## Test File Templates

### Basic Test Structure
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {
    // Arrange
    const input = {};

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Mock Structure
```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('../path/to/module', () => ({
  functionName: vi.fn(),
}));

// Mock implementation
vi.mocked(module.functionName).mockReturnValue(expectedValue);
```

## Test Checklist

Before marking a test suite complete:

- [ ] All tests pass
- [ ] Coverage meets 80% threshold
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] No console warnings or errors

## Reporting Issues

If tests fail:

1. Check error messages
2. Review test file for issues
3. Verify mocks are correct
4. Check implementation code
5. Document findings in agent-output.md
6. Update status if needed

## Progress Metrics

Track your progress with:

```bash
# Count total tests
grep -r "it(" tests/unit/ | wc -l

# Count passed tests
npm test 2>&1 | grep "Test Files" | grep "✓"

# View current feature statuses
find .automaker/features -name "feature.json" -exec grep -l '"status"' {} \;
```

---

**Remember**: The goal is 100% test pass rate and 80%+ coverage across all metrics!
