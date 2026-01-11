/**
 * File Watcher Service
 * Chokidar-based file system watcher that monitors designated folder for new audio files
 * and triggers the transcription pipeline while updating the database with session records.
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { Stats } from 'fs';
import { eq, desc } from 'drizzle-orm';
import { db } from '~/db';
import { sessions, auditLogs, noteTemplates } from '~/db/schema';
import { whisperService } from '../whisper';
import {
  fileWatcherConfig,
  getAbsoluteWatchPath,
  getAudioFormat,
  isSupportedExtension,
  validateConfig,
} from './config';
import type {
  FileWatcherStatus,
  DetectedAudioFile,
  FileWatcherEvent,
  FileWatcherEventCallback,
  FileWatcherStats,
  FileProcessingResult,
  FileValidationResult,
} from './types';
import type { NewAuditLog } from '~/db/schema/auditLogs';

export class FileWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private status: FileWatcherStatus = 'stopped';
  private startedAt?: Date;
  private filesDetected: number = 0;
  private filesProcessed: number = 0;
  private filesFailed: number = 0;
  private lastFileDetectedAt?: Date;
  private eventCallbacks: Set<FileWatcherEventCallback> = new Set();
  private processingFiles: Set<string> = new Set();

  /**
   * Start watching for audio files
   */
  async start(): Promise<{ success: boolean; error?: string }> {
    if (this.watcher) {
      return { success: false, error: 'File watcher is already running' };
    }

    if (!fileWatcherConfig.enabled) {
      return { success: false, error: 'File watcher is disabled in configuration' };
    }

    // Validate configuration
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      return { success: false, error: `Invalid configuration: ${configValidation.errors.join(', ')}` };
    }

    const watchPath = getAbsoluteWatchPath();

    // Ensure watch directory exists
    try {
      await fs.mkdir(watchPath, { recursive: true });
    } catch (error) {
      return {
        success: false,
        error: `Failed to create watch directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    this.status = 'starting';

    try {
      // Build glob pattern for supported extensions
      const extensions = fileWatcherConfig.supportedExtensions
        .map(ext => ext.replace(/^\./, ''))
        .join(',');
      const globPattern = `**/*.{${extensions}}`;

      // Create chokidar watcher
      this.watcher = chokidar.watch(path.join(watchPath, globPattern), {
        ignored: fileWatcherConfig.ignoredPatterns,
        persistent: true,
        ignoreInitial: !fileWatcherConfig.processExistingOnStartup,
        usePolling: fileWatcherConfig.usePolling,
        interval: fileWatcherConfig.pollInterval,
        awaitWriteFinish: {
          stabilityThreshold: fileWatcherConfig.awaitWriteFinishStabilityThreshold,
          pollInterval: fileWatcherConfig.awaitWriteFinishPollInterval,
        },
        depth: 10, // Max depth of directories to watch
        alwaysStat: true, // Always get file stats
      });

      // Set up event handlers
      this.watcher
        .on('add', (filePath, stats) => this.handleFileAdd(filePath, stats))
        .on('error', (error: unknown) => this.handleError(error instanceof Error ? error : new Error(String(error))))
        .on('ready', () => {
          this.status = 'running';
          this.startedAt = new Date();
          this.emitEvent({
            type: 'watcher_started',
            timestamp: new Date(),
            message: `File watcher started monitoring: ${watchPath}`,
          });
          this.logAuditEvent('file_watcher_started', {
            watchPath,
            supportedExtensions: fileWatcherConfig.supportedExtensions,
            usePolling: fileWatcherConfig.usePolling,
          });
        });

      return { success: true };
    } catch (error) {
      this.status = 'error';
      return {
        success: false,
        error: `Failed to start file watcher: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Stop watching for audio files
   */
  async stop(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    this.status = 'stopping';

    await this.watcher.close();
    this.watcher = null;
    this.status = 'stopped';

    this.emitEvent({
      type: 'watcher_stopped',
      timestamp: new Date(),
      message: 'File watcher stopped',
    });

    await this.logAuditEvent('file_watcher_stopped', {
      filesDetected: this.filesDetected,
      filesProcessed: this.filesProcessed,
      filesFailed: this.filesFailed,
    });
  }

  /**
   * Get current watcher statistics
   */
  getStats(): FileWatcherStats {
    return {
      status: this.status,
      startedAt: this.startedAt,
      filesDetected: this.filesDetected,
      filesProcessed: this.filesProcessed,
      filesFailed: this.filesFailed,
      lastFileDetectedAt: this.lastFileDetectedAt,
      watchPath: getAbsoluteWatchPath(),
      isPolling: fileWatcherConfig.usePolling,
    };
  }

  /**
   * Subscribe to file watcher events
   */
  onEvent(callback: FileWatcherEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  /**
   * Handle new file detected
   */
  private async handleFileAdd(filePath: string, stats?: Stats): Promise<void> {
    // Prevent duplicate processing
    if (this.processingFiles.has(filePath)) {
      return;
    }

    // Validate the file
    const validation = await this.validateFile(filePath, stats);
    if (!validation.valid) {
      console.warn(`Skipping file ${filePath}: ${validation.error}`);
      return;
    }

    this.processingFiles.add(filePath);
    this.filesDetected++;
    this.lastFileDetectedAt = new Date();

    const detectedFile: DetectedAudioFile = {
      fileName: path.basename(filePath),
      filePath,
      format: validation.format!,
      fileSize: validation.fileSize!,
      detectedAt: new Date(),
    };

    this.emitEvent({
      type: 'file_detected',
      timestamp: new Date(),
      file: detectedFile,
      message: `New audio file detected: ${detectedFile.fileName}`,
    });

    // Process the file
    const result = await this.processFile(detectedFile);

    if (result.success) {
      this.filesProcessed++;
      this.emitEvent({
        type: 'file_processed',
        timestamp: new Date(),
        file: detectedFile,
        sessionId: result.sessionId,
        message: `Audio file processed successfully: ${detectedFile.fileName}`,
      });
    } else {
      this.filesFailed++;
      this.emitEvent({
        type: 'file_error',
        timestamp: new Date(),
        file: detectedFile,
        error: result.error,
        message: `Failed to process audio file: ${detectedFile.fileName}`,
      });
    }

    this.processingFiles.delete(filePath);
  }

  /**
   * Validate a detected file
   */
  private async validateFile(filePath: string, stats?: Stats): Promise<FileValidationResult> {
    // Check extension
    if (!isSupportedExtension(filePath)) {
      return { valid: false, error: 'Unsupported file extension' };
    }

    // Get file stats if not provided
    let fileStats = stats;
    if (!fileStats) {
      try {
        fileStats = await fs.stat(filePath);
      } catch {
        return { valid: false, error: 'Cannot access file' };
      }
    }

    // Check if it's a regular file
    if (!fileStats.isFile()) {
      return { valid: false, error: 'Not a regular file' };
    }

    const fileSize = fileStats.size;

    // Check minimum file size
    if (fileSize < fileWatcherConfig.minFileSizeBytes) {
      return { valid: false, error: `File too small (${fileSize} bytes < ${fileWatcherConfig.minFileSizeBytes} bytes minimum)` };
    }

    // Check maximum file size
    if (fileWatcherConfig.maxFileSizeBytes > 0 && fileSize > fileWatcherConfig.maxFileSizeBytes) {
      return { valid: false, error: `File too large (${fileSize} bytes > ${fileWatcherConfig.maxFileSizeBytes} bytes maximum)` };
    }

    // Get audio format
    const format = getAudioFormat(filePath);
    if (!format) {
      return { valid: false, error: 'Could not determine audio format' };
    }

    return {
      valid: true,
      format,
      fileSize,
    };
  }

  /**
   * Process a detected audio file
   */
  private async processFile(file: DetectedAudioFile): Promise<FileProcessingResult> {
    const startTime = Date.now();

    try {
      this.emitEvent({
        type: 'file_processing',
        timestamp: new Date(),
        file,
        message: `Processing audio file: ${file.fileName}`,
      });

      // Get default template
      const template = await this.getDefaultTemplate();
      if (!template) {
        return {
          success: false,
          error: 'No default template available. Please create a template first.',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Create session record
      const session = await this.createSession(file, template.id);

      // Log audit event
      await this.logAuditEvent('session_created', {
        sessionId: session.id,
        fileName: file.fileName,
        filePath: file.filePath,
        format: file.format,
        fileSize: file.fileSize,
        templateId: template.id,
        source: 'file_watcher',
      });

      // Enqueue for transcription
      const enqueueResult = await whisperService.enqueue({
        sessionId: session.id,
        audioFilePath: file.filePath,
        audioFormat: file.format,
        priority: 100, // Default priority
      });

      if (!enqueueResult.success) {
        // Update session to failed status
        await db
          .update(sessions)
          .set({
            status: 'failed',
            errorMessage: enqueueResult.error,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, session.id));

        return {
          success: false,
          sessionId: session.id,
          error: enqueueResult.error,
          processingTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        sessionId: session.id,
        queueItemId: enqueueResult.data?.queueItemId,
        transcriptionId: enqueueResult.data?.transcriptionId,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get the default template for new sessions
   */
  private async getDefaultTemplate(): Promise<{ id: string } | null> {
    // If a default template ID is configured, use it
    if (fileWatcherConfig.defaultTemplateId) {
      const template = await db.query.noteTemplates.findFirst({
        where: eq(noteTemplates.id, fileWatcherConfig.defaultTemplateId),
        columns: { id: true },
      });
      if (template) {
        return template;
      }
    }

    // Otherwise, get the most recently created active template
    const template = await db.query.noteTemplates.findFirst({
      where: eq(noteTemplates.status, 'active'),
      orderBy: [desc(noteTemplates.createdAt)],
      columns: { id: true },
    });

    return template || null;
  }

  /**
   * Create a new session for the detected audio file
   */
  private async createSession(
    file: DetectedAudioFile,
    templateId: string
  ): Promise<{ id: string }> {
    const [session] = await db
      .insert(sessions)
      .values({
        templateId,
        status: 'pending',
        audioFilePath: file.filePath,
        audioFormat: file.format,
        audioFileSize: file.fileSize,
        metadata: {
          source: 'file_watcher',
          originalFileName: file.fileName,
          detectedAt: file.detectedAt.toISOString(),
        },
      })
      .returning({ id: sessions.id });

    return session;
  }

  /**
   * Handle watcher errors
   */
  private handleError(error: Error): void {
    console.error('File watcher error:', error);

    this.emitEvent({
      type: 'watcher_error',
      timestamp: new Date(),
      error: error.message,
      message: `File watcher error: ${error.message}`,
    });

    this.logAuditEvent('system_error', {
      source: 'file_watcher',
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * Emit an event to all subscribers
   */
  private emitEvent(event: FileWatcherEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in file watcher event callback:', error);
      }
    }
  }

  /**
   * Log an audit event
   */
  private async logAuditEvent(
    action: 'file_watcher_started' | 'file_watcher_stopped' | 'session_created' | 'system_error',
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      // Map internal actions to valid audit enum values
      const auditAction = action === 'system_error' ? 'system_error' :
                          action === 'session_created' ? 'session_created' :
                          action; // file_watcher_started, file_watcher_stopped are valid

      await db.insert(auditLogs).values({
        action: auditAction,
        severity: 'info',
        actorType: 'system',
        resourceType: 'file_watcher',
        description: `File watcher: ${action}`,
        metadata,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}

// Default singleton instance
export const fileWatcherService = new FileWatcherService();
