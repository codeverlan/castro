# Debug Plan for Failed Tests

**Created:** 2025-01-10 03:00
**Progress:** 126/192 tests passing (65.6%) 📈 +12.0% from initial

---

## 📊 Current Status by Component

| Component | Total | Passing | Failed | Pass Rate | Change |
|-----------|-------|---------|---------|------------|--------|
| File Watcher | 40 | 23 | 17 | 57.5% | +57.5% ✅ |
| Note Templates | 59 | 43 | 16 | 72.9% | 0% |
| Gap Prompts | 28 | 13 | 15 | 46.4% | 0% |
| Content Mapping | 18 | 8 | 10 | 44.4% | 0% |
| Gap Detection | 20 | 18 | 2 | 90% | 0% |
| Utils | 27 | 21 | 6 | 77.8% | 0% |
| **TOTAL** | **192** | **126** | **66** | **65.6%** | **+12%** |

---

## ✅ Completed Fixes

### 1. File Watcher Mock Setup
**Status:** ✅ PARTIALLY FIXED (23/40 passing)

**What was fixed:**
- Corrected `vi.mocked()` usage for fs/promises
- Fixed mock variable references (`mockFs.stat` → `mockStat`)
- Updated chokidar mock to use proper module mock syntax

**Remaining issues (17 failures):**

#### Issue 1: Service not starting successfully
**Error:** `expected false to be true` for `result.success`

**Root cause:** The `ready` event is async but the test doesn't wait for it

**Fix needed:**
```typescript
// Add await after start() to wait for ready event
const result = await service.start();
await new Promise(resolve => setTimeout(resolve, 10)); // Wait for ready event
```

#### Issue 2: Database mocks not being called
**Error:** `"vi.fn()" to be called with arguments... Number of calls: 0`

**Root cause:** Database operations in `start()` are only triggered when a file is actually added, which doesn't happen in these tests

**Fix needed:** Tests should either:
1. Actually trigger a file add event, OR
2. Adjust expectations to only test what actually runs

#### Issue 3: Status not changing to 'running'
**Error:** `expected 'error' to be 'running'`

**Root cause:** The ready event handler sets status to 'running', but it's async

**Fix:** Same as Issue 1 - add delay/wait after start()

---

## 🔧 Debugging Roadmap

### Phase 1: Complete File Watcher Tests (Priority: HIGH)
**Estimated time:** 30 minutes
**Impact:** 17 test fixes

**Tasks:**
1. ✅ Fix mock setup syntax
2. ⏳ Add async/await for ready event handling
3. ⏳ Update database-related tests to trigger actual file events OR adjust expectations
4. ⏳ Verify all 40 tests passing

### Phase 2: Schema Validation Tests (Priority: HIGH)
**Estimated time:** 45 minutes
**Impact:** 31 test fixes (16 + 15)

**Root cause:** Import/export mismatch

**Tasks:**
1. ⏳ List all actual exports from `src/validations/gapPrompt.ts`
2. ⏳ List all actual exports from `src/validations/noteTemplates.ts`
3. ⏳ Compare with test imports
4. ⏳ Either:
   - Create missing schemas, OR
   - Update test imports to match existing exports
5. ⏳ Verify all 31 tests passing

**Commands to run:**
```bash
# Check actual exports
cat src/validations/gapPrompt.ts | grep -E "^export (const|function|class|type|interface)"

# Check what tests import
head -30 tests/unit/validations/gapPrompt.test.ts | grep "import"
```

### Phase 3: Content Mapping Service Tests (Priority: MEDIUM)
**Estimated time:** 30 minutes
**Impact:** 10 test fixes

**Root causes:**
1. `mockRequest` variable scope issue (5 tests)
2. Wrong expectations for rewriting behavior
3. Metrics timing not being captured

**Tasks:**
1. ⏳ Move `mockRequest` to correct scope
2. ⏳ Adjust test expectations based on actual engine behavior
3. ⏳ Add `performance.now()` mock if needed
4. ⏳ Fix empty transcription handling (TypeError on `find`)
5. ⏳ Verify all 18 tests passing

### Phase 4: Gap Detection Service Tests (Priority: LOW)
**Estimated time:** 15 minutes
**Impact:** 2 test fixes

**Root cause:** `performance.now()` not being mocked

**Tasks:**
1. ⏳ Add performance.now() mock
2. ⏳ Verify timing metrics are captured
3. ⏳ Verify all 20 tests passing

### Phase 5: Utils Tests (Priority: LOW)
**Estimated time:** 20 minutes
**Impact:** 6 test fixes

**Root cause:** Test expectations don't match actual `tailwind-merge` behavior

**Tasks:**
1. ⏳ Test actual `cn()` function behavior manually
2. ⏳ Adjust test expectations to match actual behavior
3. ⏳ Verify all 27 tests passing

---

## 📝 Quick Reference Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/services/fileWatcher.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Check exports from validation files
cat src/validations/gapPrompt.ts | grep -E "^export"

# Run only failing tests
npm test -- --reporter=verbose 2>&1 | grep "✗\|×"

# View Kanban board
cat .automaker/TESTING_KANBAN.md
```

---

## 🎯 Success Metrics

- [ ] File Watcher: 40/40 passing (currently 23/40)
- [ ] Note Templates: 59/59 passing (currently 43/59)
- [ ] Gap Prompts: 28/28 passing (currently 13/28)
- [ ] Content Mapping: 18/18 passing (currently 8/18)
- [ ] Gap Detection: 20/20 passing (currently 18/20)
- [ ] Utils: 27/27 passing (currently 21/27)
- [ ] **Overall: 192/192 passing (currently 126/192, 65.6%)**

---

## 📌 Notes

1. **File watcher tests** now properly mock fs/promises and chokidar - significant progress!
2. **Schema tests** likely need either missing schemas created or imports updated
3. **Content mapping tests** have variable scope issues that need fixing
4. **Gap detection and utils tests** have minor mock/expectation issues

---

## 🚀 Next Steps

1. **Immediate:** Fix file watcher async ready event handling (10 min)
2. **Next:** Investigate and fix schema validation imports (30 min)
3. **Then:** Fix content mapping variable scope (20 min)
4. **Finally:** Quick fixes for gap detection and utils (15 min)

**Estimated total time to fix all 66 remaining failures:** ~2 hours
