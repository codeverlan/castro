/**
 * File Watcher Service Types
 * Type definitions for chokidar-based file system watcher
 */

import type { AudioFormat } from '../whisper/types';

// File watcher status
export type FileWatcherStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

// Detected audio file information
export interface DetectedAudioFile {
  fileName: string;
  filePath: string;
  format: AudioFormat;
  fileSize: number;
  detectedAt: Date;
}

// File watcher event types
export type FileWatcherEventType =
  | 'file_detected'
  | 'file_processing'
  | 'file_processed'
  | 'file_error'
  | 'watcher_started'
  | 'watcher_stopped'
  | 'watcher_error';

// File watcher event
export interface FileWatcherEvent {
  type: FileWatcherEventType;
  timestamp: Date;
  file?: DetectedAudioFile;
  sessionId?: string;
  error?: string;
  message?: string;
}

// Event callback function type
export type FileWatcherEventCallback = (event: FileWatcherEvent) => void;

// File watcher statistics
export interface FileWatcherStats {
  status: FileWatcherStatus;
  startedAt?: Date;
  filesDetected: number;
  filesProcessed: number;
  filesFailed: number;
  lastFileDetectedAt?: Date;
  watchPath: string;
  isPolling: boolean;
}

// Processing result for a detected file
export interface FileProcessingResult {
  success: boolean;
  sessionId?: string;
  queueItemId?: string;
  transcriptionId?: string;
  error?: string;
  processingTimeMs: number;
}

// File validation result
export interface FileValidationResult {
  valid: boolean;
  format?: AudioFormat;
  fileSize?: number;
  error?: string;
}
