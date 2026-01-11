/**
 * Whisper Service Module
 * Node.js service for interfacing with local Whisper.cpp installation
 *
 * Features:
 * - Queue management for transcription jobs
 * - Progress tracking during transcription
 * - Error handling with automatic retry for transient failures
 * - Support for multiple Whisper models
 * - Word-level timestamps
 * - Language detection
 */

// Client exports
export { WhisperClient, whisperClient } from './client';

// Service exports
export { WhisperService, whisperService } from './service';

// Configuration exports
export {
  whisperConfig,
  getModelConfig,
  getModelPath,
  validateConfig,
  modelConfigs,
  supportedLanguages,
  type WhisperConfig,
} from './config';

// Error exports
export {
  WhisperError,
  WhisperNotFoundError,
  WhisperModelNotFoundError,
  WhisperTimeoutError,
  WhisperAudioError,
  WhisperProcessError,
  WhisperOutputParseError,
  WhisperQueueError,
  WhisperLockError,
  WhisperMaxRetriesError,
  WhisperResourceError,
  createWhisperError,
  isWhisperError,
  isRetryableError,
  getErrorSeverity,
} from './errors';

// Type exports
export type {
  WhisperModel,
  AudioFormat,
  TranscriptionStatus,
  WhisperTranscriptionOptions,
  WordTiming,
  WhisperSegment,
  WhisperTranscriptionResult,
  TranscriptionRequest,
  TranscriptionProgress,
  ProgressCallback,
  QueueItem,
  QueueProcessingOptions,
  WhisperServiceResponse,
  WhisperHealthCheckResult,
  TranscriptionCompletionResult,
} from './types';
