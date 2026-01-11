/**
 * Gap Detection Engine Module
 *
 * Dedicated service for analyzing mapped content against template requirements
 * to identify documentation gaps and generate contextual questions.
 *
 * @example
 * ```typescript
 * import {
 *   gapDetectionEngine,
 *   validateGapDetectionRequest,
 * } from './services/gapDetection';
 *
 * // Detect gaps in mapped content
 * const result = await gapDetectionEngine.detectGaps({
 *   sessionId: 'uuid-here',
 *   mappedSections: [...],
 *   templateSections: [...],
 *   transcription: 'Original transcription...',
 *   clinicalContext: { presentingIssues: ['anxiety'], ... },
 * });
 *
 * // Access detected gaps
 * for (const gap of result.gaps) {
 *   console.log(`${gap.sectionName}: ${gap.description}`);
 *   console.log(`  Question: ${gap.primaryQuestion}`);
 *   console.log(`  Severity: ${gap.severity}`);
 * }
 *
 * // Check completeness
 * console.log(`Completeness: ${result.completenessScore}%`);
 * console.log(`Critical gaps: ${result.summary.criticalGaps}`);
 * ```
 */

// Main engine
export { GapDetectionEngine, gapDetectionEngine } from './engine';

// Rules
export {
  gapDetectionRules,
  getRulesBySeverity,
  getRulesByPriority,
  getRuleById,
} from './rules';

// Prompts
export {
  gapAnalysisSystemPrompt,
  questionGenerationSystemPrompt,
  generateDeepAnalysisPrompt,
  generateQuestionPrompt,
  generateDefaultQuestion,
  generateDefaultRationale,
} from './prompts';

// Types
export type {
  // Core types
  GapDetectionRequest,
  GapDetectionResult,
  GapDetectionOptions,
  DetectedGap,
  SectionScore,
  GapSummary,
  GapDetectionMetrics,
  // Supporting types
  GapType,
  TemplateFieldInfo,
  ClinicalContextSummary,
  QuestionGenerationContext,
  GeneratedQuestion,
  // Rule types
  GapDetectionRule,
  RuleContext,
} from './types';

// Default options
export { DEFAULT_GAP_DETECTION_OPTIONS } from './types';

// Validation schemas
export {
  // Enum schemas
  gapSeveritySchema,
  gapTypeSchema,
  sectionStatusSchema,
  // Input schemas
  templateFieldInfoSchema,
  clinicalContextSummarySchema,
  mappingSectionInfoSchema,
  mappedSectionContentSchema,
  gapDetectionRequestSchema,
  gapDetectionOptionsSchema,
  // Result schemas
  detectedGapSchema,
  sectionScoreSchema,
  gapSummarySchema,
  gapDetectionMetricsSchema,
  gapDetectionResultSchema,
  // API schemas
  analyzeGapsRequestSchema,
  analyzeGapsResponseSchema,
  getGapsRequestSchema,
  resolveGapRequestSchema,
} from './validations';

// Validation helper functions
export {
  validateGapDetectionRequest,
  validateGapDetectionOptions,
  validateAnalyzeGapsRequest,
  validateGetGapsRequest,
  validateResolveGapRequest,
} from './validations';

// Validation types
export type {
  GapSeverity,
  GapType as GapTypeValidation,
  SectionStatus,
  TemplateFieldInfoInput,
  ClinicalContextSummaryInput,
  MappingSectionInfoInput,
  MappedSectionContentInput,
  GapDetectionRequestInput,
  GapDetectionOptionsInput,
  DetectedGapInput,
  SectionScoreInput,
  GapSummaryInput,
  GapDetectionMetricsInput,
  GapDetectionResultInput,
  AnalyzeGapsRequestInput,
  AnalyzeGapsResponseInput,
  GetGapsRequestInput,
  ResolveGapRequestInput,
} from './validations';
