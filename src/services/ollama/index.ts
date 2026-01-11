/**
 * Ollama Service Module
 *
 * Service layer for communicating with local Ollama instance
 * for clinical documentation AI operations.
 *
 * @example
 * ```typescript
 * import { ollamaService, ollamaClient } from './services/ollama';
 *
 * // Check if Ollama is available
 * const health = await ollamaService.checkHealth();
 *
 * // Map transcription to template sections
 * const mapping = await ollamaService.mapContent({
 *   transcription: 'Session transcription text...',
 *   templateSections: [{ id: '1', name: 'Presenting Problem' }]
 * });
 *
 * // Rewrite content professionally
 * const rewrite = await ollamaService.rewriteProfessionally({
 *   content: 'Raw content...',
 *   sectionType: 'Assessment',
 *   targetTone: 'clinical'
 * });
 *
 * // Analyze documentation gaps
 * const gaps = await ollamaService.analyzeGaps({
 *   transcription: 'Session transcription...',
 *   templateSections: [/* sections *\/]
 * });
 * ```
 */

// Main service
export { OllamaService, ollamaService } from './service';

// API client
export { OllamaClient, ollamaClient } from './client';

// Configuration
export { ollamaConfig, getModelConfig, validateConfig } from './config';
export type { OllamaConfig } from './config';

// Prompt templates
export {
  contentMappingPrompts,
  professionalRewritePrompts,
  gapAnalysisPrompts,
  buildPrompt,
} from './prompts';

// Types
export type {
  // Core Ollama types
  OllamaModel,
  OllamaRequestOptions,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaChatMessage,
  OllamaTagsResponse,
  OllamaModelInfo,
  // Service-specific types
  ContentMappingRequest,
  ContentMappingResult,
  ProfessionalRewriteRequest,
  ProfessionalRewriteResult,
  GapAnalysisRequest,
  GapAnalysisResult,
  GapInfo,
  TemplateSectionInfo,
  OllamaServiceResponse,
} from './types';

// Errors
export {
  OllamaError,
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaModelNotFoundError,
  OllamaValidationError,
  OllamaRateLimitError,
  OllamaServerError,
  createOllamaError,
  isOllamaError,
  isRetryableError,
} from './errors';
