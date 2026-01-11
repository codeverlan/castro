/**
 * File Watcher Service Module
 * Chokidar-based file system watcher for automatic audio file detection and transcription
 *
 * Features:
 * - Monitors designated folder for new audio files (mp3, wav, m4a, ogg, webm)
 * - Automatically triggers transcription pipeline via WhisperService
 * - Creates session records in database
 * - Configurable via environment variables
 * - Event-driven architecture for progress tracking
 * - Audit logging for all operations
 */

// Service exports
export { FileWatcherService, fileWatcherService } from './service';

// Configuration exports
export {
  fileWatcherConfig,
  getAbsoluteWatchPath,
  getAudioFormat,
  isSupportedExtension,
  validateConfig,
  extensionToFormat,
  supportedExtensions,
  type FileWatcherConfig,
} from './config';

// Type exports
export type {
  FileWatcherStatus,
  DetectedAudioFile,
  FileWatcherEventType,
  FileWatcherEvent,
  FileWatcherEventCallback,
  FileWatcherStats,
  FileProcessingResult,
  FileValidationResult,
} from './types';
