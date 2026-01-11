/**
 * Content Mapping Engine Module
 *
 * AI-powered service that analyzes transcription text and intelligently
 * maps content to appropriate template sections using local LLM.
 *
 * @example
 * ```typescript
 * import {
 *   contentMappingEngine,
 *   contentMappingRepository,
 *   validateMappingRequest,
 * } from './services/contentMapping';
 *
 * // Process a transcription
 * const result = await contentMappingEngine.mapContent({
 *   sessionId: 'uuid-here',
 *   transcription: 'Session transcription text...',
 *   sections: [
 *     { id: '1', name: 'Subjective', description: '...', ... },
 *     { id: '2', name: 'Objective', description: '...', ... },
 *   ],
 *   patientContext: 'Optional context about the client',
 * });
 *
 * // Store results in database
 * if (result.success) {
 *   await contentMappingRepository.storeMappingResults(
 *     result.sessionId,
 *     result
 *   );
 * }
 *
 * // Get stored results
 * const stored = await contentMappingRepository.getSessionWithMappings(sessionId);
 * ```
 */

// Main engine
export { ContentMappingEngine, contentMappingEngine } from './engine';

// Database repository
export { ContentMappingRepository, contentMappingRepository } from './repository';

// Prompt templates
export {
  clinicalContextPrompts,
  sectionMappingPrompts,
  rewritingPrompts,
  gapAnalysisPrompts,
} from './prompts';

// Types
export type {
  // Core types
  GapSeverity,
  ClinicalContext,
  MappingSectionInfo,
  ContentMappingEngineRequest,
  MappedSectionContent,
  DocumentationGap,
  ContentMappingEngineResult,
  MappingMetrics,
  ContentMappingEngineOptions,
  StoreMappingRequest,
} from './types';

// Helper functions
export { templateSectionToMappingInfo } from './types';

// Validation schemas
export {
  // Enum schemas
  gapSeveritySchema,
  // Data schemas
  clinicalContextSchema,
  mappingSectionInfoSchema,
  sessionMetadataSchema,
  contentMappingEngineRequestSchema,
  contentMappingEngineOptionsSchema,
  mappedSectionContentSchema,
  documentationGapSchema,
  mappingMetricsSchema,
  contentMappingEngineResultSchema,
  // Storage schemas
  storeMappingRequestSchema,
  updateSectionContentSchema,
  resolveGapSchema,
  // API schemas
  processMappingRequestSchema,
  processMappingResponseSchema,
  getMappingResultsRequestSchema,
} from './validations';

// Validation helper functions
export {
  validateMappingRequest,
  validateMappingOptions,
  validateSectionUpdate,
  validateGapResolution,
} from './validations';

// Validation types
export type {
  ClinicalContextInput,
  MappingSectionInfoInput,
  SessionMetadataInput,
  ContentMappingEngineRequestInput,
  ContentMappingEngineOptionsInput,
  MappedSectionContentInput,
  DocumentationGapInput,
  MappingMetricsInput,
  ContentMappingEngineResultInput,
  StoreMappingRequestInput,
  UpdateSectionContentInput,
  ResolveGapInput,
  ProcessMappingRequestInput,
  ProcessMappingResponseInput,
  GetMappingResultsRequestInput,
} from './validations';
