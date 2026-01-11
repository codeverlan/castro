/**
 * File Watcher Service Configuration
 * Environment-based configuration for chokidar file system watcher
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import type { AudioFormat } from '../whisper/types';

dotenv.config();

export interface FileWatcherConfig {
  // Path to watch for audio files
  watchPath: string;
  // Supported audio file extensions
  supportedExtensions: string[];
  // Whether to use polling (required for network drives)
  usePolling: boolean;
  // Polling interval in milliseconds (if usePolling is true)
  pollInterval: number;
  // Time to wait for file write to stabilize (ms)
  awaitWriteFinishStabilityThreshold: number;
  // Poll interval while waiting for file write to finish (ms)
  awaitWriteFinishPollInterval: number;
  // Patterns to ignore (glob patterns)
  ignoredPatterns: string[];
  // Whether to process existing files on startup
  processExistingOnStartup: boolean;
  // Default template ID for new sessions (optional - will use default template if not set)
  defaultTemplateId?: string;
  // Whether the file watcher is enabled
  enabled: boolean;
  // Maximum file size to process (in bytes, 0 = no limit)
  maxFileSizeBytes: number;
  // Minimum file size to process (in bytes, to skip incomplete files)
  minFileSizeBytes: number;
}

// Mapping from file extension to AudioFormat
export const extensionToFormat: Record<string, AudioFormat> = {
  '.mp3': 'mp3',
  '.wav': 'wav',
  '.m4a': 'm4a',
  '.ogg': 'ogg',
  '.webm': 'webm',
};

// Get supported extensions as array
export const supportedExtensions = Object.keys(extensionToFormat);

export const fileWatcherConfig: FileWatcherConfig = {
  // Path to watch for audio files
  watchPath: process.env.FILE_WATCHER_PATH || './audio-inbox',

  // Supported extensions (read from env or use defaults)
  supportedExtensions: process.env.FILE_WATCHER_EXTENSIONS
    ? process.env.FILE_WATCHER_EXTENSIONS.split(',').map(ext => ext.trim().toLowerCase())
    : supportedExtensions,

  // Use polling (recommended for network drives or Docker volumes)
  usePolling: process.env.FILE_WATCHER_USE_POLLING === 'true',

  // Polling interval in milliseconds
  pollInterval: parseInt(process.env.FILE_WATCHER_POLL_INTERVAL || '1000', 10),

  // Time to wait for file write to complete (stabilize)
  awaitWriteFinishStabilityThreshold: parseInt(
    process.env.FILE_WATCHER_STABILITY_THRESHOLD || '2000',
    10
  ),

  // Poll interval while waiting for write to finish
  awaitWriteFinishPollInterval: parseInt(
    process.env.FILE_WATCHER_STABILITY_POLL_INTERVAL || '100',
    10
  ),

  // Ignored patterns (comma-separated glob patterns)
  ignoredPatterns: process.env.FILE_WATCHER_IGNORED_PATTERNS
    ? process.env.FILE_WATCHER_IGNORED_PATTERNS.split(',').map(p => p.trim())
    : [
        '**/.*',           // Hidden files
        '**/*.tmp',        // Temp files
        '**/*.part',       // Partial downloads
        '**/~*',           // Temp files (another pattern)
        '**/*.crdownload', // Chrome downloads in progress
      ],

  // Process existing files when watcher starts
  processExistingOnStartup: process.env.FILE_WATCHER_PROCESS_EXISTING !== 'false',

  // Default template ID (optional)
  defaultTemplateId: process.env.FILE_WATCHER_DEFAULT_TEMPLATE_ID || undefined,

  // Whether file watcher is enabled
  enabled: process.env.FILE_WATCHER_ENABLED !== 'false',

  // Maximum file size (500MB default)
  maxFileSizeBytes: parseInt(process.env.FILE_WATCHER_MAX_FILE_SIZE || '524288000', 10),

  // Minimum file size (1KB default - to skip empty/incomplete files)
  minFileSizeBytes: parseInt(process.env.FILE_WATCHER_MIN_FILE_SIZE || '1024', 10),
};

/**
 * Get the absolute watch path
 */
export function getAbsoluteWatchPath(): string {
  if (path.isAbsolute(fileWatcherConfig.watchPath)) {
    return fileWatcherConfig.watchPath;
  }
  return path.resolve(process.cwd(), fileWatcherConfig.watchPath);
}

/**
 * Get audio format from file extension
 */
export function getAudioFormat(filePath: string): AudioFormat | null {
  const ext = path.extname(filePath).toLowerCase();
  return extensionToFormat[ext] || null;
}

/**
 * Check if a file extension is supported
 */
export function isSupportedExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return fileWatcherConfig.supportedExtensions.includes(ext);
}

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!fileWatcherConfig.watchPath) {
    errors.push('FILE_WATCHER_PATH is not configured');
  }

  if (fileWatcherConfig.supportedExtensions.length === 0) {
    errors.push('No supported file extensions configured');
  }

  if (fileWatcherConfig.pollInterval < 100) {
    errors.push('FILE_WATCHER_POLL_INTERVAL should be at least 100ms');
  }

  if (fileWatcherConfig.awaitWriteFinishStabilityThreshold < 500) {
    errors.push('FILE_WATCHER_STABILITY_THRESHOLD should be at least 500ms');
  }

  if (fileWatcherConfig.minFileSizeBytes < 0) {
    errors.push('FILE_WATCHER_MIN_FILE_SIZE should be non-negative');
  }

  if (fileWatcherConfig.maxFileSizeBytes > 0 &&
      fileWatcherConfig.maxFileSizeBytes < fileWatcherConfig.minFileSizeBytes) {
    errors.push('FILE_WATCHER_MAX_FILE_SIZE should be greater than MIN_FILE_SIZE');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
