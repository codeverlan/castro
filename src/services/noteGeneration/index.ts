/**
 * Note Generation Service
 * Main entry point for clinical note generation functionality
 *
 * This service transforms raw dictation and filled gaps into
 * professionally worded clinical documentation using local LLM.
 */

// Service
export {
  NoteGenerationService,
  noteGenerationService,
} from './service';

// Repository
export {
  NoteGenerationRepository,
  noteGenerationRepository,
} from './repository';

// Types
export type {
  ClinicalTone,
  NoteFormat,
  TemplateType,
  SectionContent,
  ResolvedGap,
  ClinicalContext,
  GenerateNoteRequest,
  GenerateNoteResult,
  RefineNoteRequest,
  RefineNoteResult,
  FormatNoteRequest,
  FormatNoteResult,
  ProcessedSection,
  NoteGenerationOptions,
  NoteGenerationMetrics,
  NoteGenerationServiceResponse,
  TemplateSection,
  SessionData,
} from './types';

// Errors
export {
  NoteGenerationError,
  SessionNotFoundError,
  TemplateNotFoundError,
  NoteNotFoundError,
  InsufficientContentError,
  LLMProcessingError,
  LLMResponseParseError,
  NoteValidationError,
  NoteDatabaseError,
  NoteGenerationTimeoutError,
  createNoteGenerationError,
  isNoteGenerationError,
  isRetryableNoteError,
} from './errors';

// Validations
export {
  // Schemas
  clinicalToneSchema,
  noteFormatSchema,
  templateTypeSchema,
  clinicalContextSchema,
  generateNoteRequestSchema,
  refineNoteRequestSchema,
  formatNoteRequestSchema,
  noteGenerationOptionsSchema,
  sectionContentSchema,
  resolvedGapSchema,
  generateNoteResultSchema,
  refineNoteResultSchema,
  formatNoteResultSchema,
  noteGenerationMetricsSchema,
  apiGenerateNoteRequestSchema,
  apiRefineNoteRequestSchema,
  // Validation functions
  validateGenerateNoteRequest,
  validateRefineNoteRequest,
  validateNoteGenerationOptions,
  validateLLMNoteResponse,
  validateLLMRefineResponse,
  validateApiGenerateNoteRequest,
  // Types
  type GenerateNoteRequestInput,
  type RefineNoteRequestInput,
  type FormatNoteRequestInput,
  type NoteGenerationOptionsInput,
  type ApiGenerateNoteRequestInput,
  type ApiRefineNoteRequestInput,
} from './validations';

// Prompts
export {
  noteGenerationPrompts,
  buildNotePrompt,
} from './prompts';
