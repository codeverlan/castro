# Castro Test Suite

This directory contains tests for the Castro application. The test suite is organized into unit tests and end-to-end (E2E) tests.

## Test Structure

```
tests/
├── unit/                          # Unit tests
│   ├── validations/               # Schema validation tests
│   │   ├── gapPrompt.test.ts     # Gap prompt Zod schema tests
│   │   └── noteTemplates.test.ts # Note template Zod schema tests
│   ├── lib/                      # Library utility tests
│   │   └── utils.test.ts         # Utility function tests
│   └── services/                 # Service layer tests
│       ├── gapDetection.test.ts   # Gap detection service tests
│       ├── contentMapping.test.ts # Content mapping service tests
│       └── fileWatcher.test.ts    # File watcher service tests
├── session-history.spec.ts        # E2E tests (Playwright)
└── setup.ts                       # Test configuration
```

## Running Tests

### Unit Tests

Run all unit tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run specific test file:
```bash
npm run test:unit -- gapPrompt
```

Run tests matching a pattern:
```bash
npm run test:unit -- -t "should validate"
```

### End-to-End Tests

Run E2E tests (requires dev server running):
```bash
npx playwright test
```

Run E2E tests in headed mode:
```bash
npx playwright test --headed
```

Run specific E2E test:
```bash
npx playwright test session-history
```

## Test Coverage

The unit tests cover:

### Validation Schemas
- **Gap Prompt Validations** (`tests/unit/validations/gapPrompt.test.ts`)
  - Field configuration validation
  - Field options validation
  - Gap prompt validation
  - Gap response validation
  - UI state validation
  - Batch operations validation

- **Note Template Validations** (`tests/unit/validations/noteTemplates.test.ts`)
  - Field type and status enums
  - Validation rules (text, number, date)
  - Field options
  - Template fields CRUD
  - Template sections CRUD
  - Note templates CRUD
  - Composite operations (create full template, clone, query)

### Utilities
- **Utility Functions** (`tests/unit/lib/utils.test.ts`)
  - `cn()` function for class name merging
  - Tailwind CSS conflict resolution
  - Conditional class handling
  - Array and object class handling

### Services
- **Gap Detection Engine** (`tests/unit/services/gapDetection.test.ts`)
  - Rule-based gap detection
  - LLM-based deep analysis
  - Section analysis
  - Completeness scoring
  - Health checks
  - Priority sorting

- **Content Mapping Engine** (`tests/unit/services/contentMapping.test.ts`)
  - Clinical context extraction
  - Section mapping
  - Content rewriting
  - Gap analysis
  - Health checks
  - Error handling

- **File Watcher Service** (`tests/unit/services/fileWatcher.test.ts`)
  - Starting/stopping watcher
  - File validation
  - File processing
  - Event emission
  - Error handling
  - Database integration

### E2E Tests
- **Session History** (`tests/session-history.spec.ts`)
  - Navigation to history page
  - Filter functionality
  - API integration tests
  - UI interactions

## Writing New Tests

### Unit Tests

Unit tests use Vitest and follow this pattern:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YourService } from '~/services/yourService';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new YourService();
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

### E2E Tests

E2E tests use Playwright and follow this pattern:

```typescript
import { test, expect } from '@playwright/test';

test('should interact with page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('element')).toBeVisible();
});
```

## Test Data

Use realistic test data that mimics production data:

```typescript
const mockRequest = {
  sessionId: '00000000-0000-0000-0000-000000000001',
  name: 'Test Template',
  // ...
};
```

## Mocking

Use `vi.fn()` for mocking functions and services:

```typescript
const mockService = {
  method: vi.fn(),
} as unknown as ServiceType;

mockService.method.mockResolvedValue({ success: true });
```

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Test edge cases**: Empty inputs, null values, error conditions
3. **Test boundaries**: Min/max values, array limits
4. **Keep tests isolated**: Each test should be independent
5. **Use descriptive names**: Test names should clearly describe what they test
6. **Mock external dependencies**: Database, APIs, file system
7. **Clean up**: Use `beforeEach` to reset state

## CI/CD Integration

Tests run automatically on:
- Every pull request
- Every merge to main

Coverage thresholds:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## Troubleshooting

### Tests are failing locally but passing in CI
- Ensure you're using the same Node.js version as CI (v18+)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Mock not working as expected
- Clear mocks in `beforeEach`: `vi.clearAllMocks()`
- Ensure mock is called before assertions

### Timeouts in E2E tests
- Increase timeout: `test.setTimeout(10000)`
- Check if dev server is running
- Verify network conditions

## Adding New Test Suites

1. Create test file in appropriate directory
2. Import test utilities and dependencies
3. Write tests following existing patterns
4. Run tests to ensure they pass
5. Update this README if adding new categories
