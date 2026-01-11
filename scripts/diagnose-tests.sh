#!/bin/bash

# Test Diagnostics Script
# This script gathers information about test failures

echo "=========================================="
echo "🔍 Test Diagnostics for Castro Project"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p .automaker/diagnostics
OUTPUT_FILE=".automaker/diagnostics/$(date +%Y%m%d_%H%M%S)_diagnostics.txt"

echo "📊 Running diagnostics..."
echo "Output will be saved to: $OUTPUT_FILE"
echo ""

# Start output file
{
  echo "=========================================="
  echo "Test Diagnostics Report"
  echo "Generated: $(date)"
  echo "=========================================="
  echo ""
} > "$OUTPUT_FILE"

# ========================================
# Section 1: Validation Schema Exports
# ========================================
echo -e "${BLUE}[1/6]${NC} Checking validation schema exports..."

{
  echo "=========================================="
  echo "1. VALIDATION SCHEMA EXPORTS"
  echo "=========================================="
  echo ""
  echo "Gap Prompt Validation Exports:"
  echo "------------------------------"
  cat src/validations/gapPrompt.ts 2>/dev/null | grep -E "^export" || echo "❌ File not found"
  echo ""
  echo "Note Templates Validation Exports:"
  echo "----------------------------------"
  cat src/validations/noteTemplates.ts 2>/dev/null | grep -E "^export" || echo "❌ File not found"
  echo ""
} >> "$OUTPUT_FILE"

# ========================================
# Section 2: Test Imports
# ========================================
echo -e "${BLUE}[2/6]${NC} Checking test imports..."

{
  echo "=========================================="
  echo "2. TEST IMPORTS"
  echo "=========================================="
  echo ""
  echo "Gap Prompt Test Imports:"
  echo "------------------------"
  grep -h "^import.*from.*@/validations" tests/unit/validations/gapPrompt.test.ts 2>/dev/null || echo "❌ File not found"
  echo ""
  echo "Note Templates Test Imports:"
  echo "-----------------------------"
  grep -h "^import.*from.*@/validations" tests/unit/validations/noteTemplates.test.ts 2>/dev/null || echo "❌ File not found"
  echo ""
} >> "$OUTPUT_FILE"

# ========================================
# Section 3: File Watcher Imports
# ========================================
echo -e "${BLUE}[3/6]${NC} Checking file watcher fs imports..."

{
  echo "=========================================="
  echo "3. FILE WATCHER FS IMPORTS"
  echo "=========================================="
  echo ""
  echo "File Watcher Service Imports:"
  echo "------------------------------"
  head -50 src/services/fileWatcher/index.ts 2>/dev/null | grep -n "import.*fs" || echo "❌ File not found"
  echo ""
  echo "File Watcher Test Mock Setup:"
  echo "----------------------------"
  head -100 tests/unit/services/fileWatcher.test.ts 2>/dev/null | grep -n "vi.mock\|vi.stubGlobal" || echo "❌ File not found"
  echo ""
} >> "$OUTPUT_FILE"

# ========================================
# Section 4: Mock Request Scope
# ========================================
echo -e "${BLUE}[4/6]${NC} Checking mockRequest scope..."

{
  echo "=========================================="
  echo "4. MOCK REQUEST SCOPE IN CONTENT MAPPING"
  echo "=========================================="
  echo ""
  echo "Where mockRequest is defined:"
  echo "-----------------------------"
  grep -n "const mockRequest\|let mockRequest" tests/unit/services/contentMapping.test.ts 2>/dev/null || echo "❌ File not found"
  echo ""
  echo "Failing test lines that use mockRequest:"
  echo "----------------------------------------"
  grep -n "mockRequest" tests/unit/services/contentMapping.test.ts 2>/dev/null | grep -E "447|490|547|583|633" || echo "❌ File not found"
  echo ""
} >> "$OUTPUT_FILE"

# ========================================
# Section 5: Performance.now() Usage
# ========================================
echo -e "${BLUE}[5/6]${NC} Checking performance.now() usage..."

{
  echo "=========================================="
  echo "5. PERFORMANCE.NOW() USAGE"
  echo "=========================================="
  echo ""
  echo "Gap Detection Engine:"
  echo "---------------------"
  grep -n "performance\.now()" src/services/gapDetection/engine.ts 2>/dev/null || echo "❌ No usage found"
  echo ""
  echo "Content Mapping Engine:"
  echo "-----------------------"
  grep -n "performance\.now()" src/services/contentMapping/engine.ts 2>/dev/null || echo "❌ No usage found"
  echo ""
} >> "$OUTPUT_FILE"

# ========================================
# Section 6: Run Tests and Capture Output
# ========================================
echo -e "${BLUE}[6/6]${NC} Running tests..."

{
  echo "=========================================="
  echo "6. TEST RESULTS"
  echo "=========================================="
  echo ""
} >> "$OUTPUT_FILE"

npm test 2>&1 | tee -a "$OUTPUT_FILE"

# ========================================
# Summary
# ========================================
echo ""
echo -e "${GREEN}✓${NC} Diagnostics complete!"
echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo ""

# Count failures
FAILURES=$(npm test 2>&1 | grep -oP '\d+(?= failed)' | head -1)
PASSING=$(npm test 2>&1 | grep -oP '\d+(?= passed)' | head -1)
TOTAL=$(npm test 2>&1 | grep -oP '\d+(?= \()' | head -1)

{
  echo ""
  echo "=========================================="
  echo "SUMMARY"
  echo "=========================================="
  echo ""
  echo "Test Results:"
  echo "  Passing: $PASSING"
  echo "  Failed:  $FAILURES"
  echo "  Total:   $TOTAL"
  echo ""
  echo "Next Steps:"
  echo "  1. Review the full diagnostics in: $OUTPUT_FILE"
  echo "  2. Follow the detailed plan in: .automaker/DEBUG_PLAN.md"
  echo "  3. Use the cheatsheet: .automaker/DEBUG_CHEATSHEET.md"
  echo ""
  echo "Priority Order:"
  echo "  1. File Watcher Mock Setup (40 failures)"
  echo "  2. Validation Schema Exports (31 failures)"
  echo "  3. Content Mapping Mock Issues (10 failures)"
  echo "  4. Gap Detection Metrics (2 failures)"
  echo "  5. Utils Test Expectations (6 failures)"
  echo ""
} >> "$OUTPUT_FILE"

# Display summary
cat "$OUTPUT_FILE" | tail -30

echo -e "${GREEN}✓${NC} Full diagnostics saved to: $OUTPUT_FILE"
