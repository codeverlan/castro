/**
 * Whisper Service
 * High-level service for audio transcription with queue management and progress tracking
 */

import { eq, and, or, lt, isNull, asc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '~/db';
import {
  transcriptions,
  transcriptionSegments,
  transcriptionQueue,
  sessions,
  auditLogs,
  processingMetrics,
} from '~/db/schema';
import { WhisperClient, whisperClient } from './client';
import { whisperConfig } from './config';
import {
  WhisperError,
  WhisperMaxRetriesError,
  WhisperLockError,
  WhisperQueueError,
  isWhisperError,
  isRetryableError,
  getErrorSeverity,
} from './errors';
import type {
  WhisperModel,
  WhisperTranscriptionOptions,
  WhisperServiceResponse,
  WhisperHealthCheckResult,
  TranscriptionRequest,
  TranscriptionProgress,
  TranscriptionCompletionResult,
  ProgressCallback,
  QueueProcessingOptions,
  QueueItem,
  TranscriptionStatus,
} from './types';

export class WhisperService {
  private client: WhisperClient;
  private defaultModel: WhisperModel;
  private isProcessingQueue: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private activeJobs: Map<string, AbortController> = new Map();

  constructor(client?: WhisperClient, defaultModel?: WhisperModel) {
    this.client = client || whisperClient;
    this.defaultModel = defaultModel || whisperConfig.defaultModel;
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<WhisperServiceResponse<WhisperHealthCheckResult>> {
    const startTime = Date.now();

    try {
      const available = await this.client.isAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Whisper executable is not available',
          processingTime: Date.now() - startTime,
        };
      }

      const version = await this.client.getVersion();
      const modelsAvailable = await this.client.listModels();

      return {
        success: true,
        data: {
          available: true,
          executablePath: whisperConfig.executablePath,
          modelsAvailable,
          version: version || undefined,
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Add a transcription request to the queue
   */
  async enqueue(
    request: TranscriptionRequest
  ): Promise<WhisperServiceResponse<{ queueItemId: string; transcriptionId: string }>> {
    const startTime = Date.now();

    try {
      // Verify session exists
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, request.sessionId),
      });

      if (!session) {
        return {
          success: false,
          error: `Session not found: ${request.sessionId}`,
          processingTime: Date.now() - startTime,
        };
      }

      // Validate audio file
      const validation = await this.client.validateAudioFile(request.audioFilePath);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          processingTime: Date.now() - startTime,
        };
      }

      // Create transcription record and queue item in a transaction
      const result = await db.transaction(async (tx) => {
        // Create transcription record
        const [transcription] = await tx
          .insert(transcriptions)
          .values({
            sessionId: request.sessionId,
            status: 'queued',
            modelUsed: request.options?.model || this.defaultModel,
          })
          .returning();

        // Create queue item
        const [queueItem] = await tx
          .insert(transcriptionQueue)
          .values({
            sessionId: request.sessionId,
            priority: request.priority || 100,
            scheduledFor: new Date(),
          })
          .returning();

        // Update session status
        await tx
          .update(sessions)
          .set({
            status: 'transcribing',
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, request.sessionId));

        // Log audit entry
        await tx.insert(auditLogs).values({
          action: 'transcription_started',
          severity: 'info',
          actorType: 'system',
          resourceType: 'transcription',
          resourceId: transcription.id,
          sessionId: request.sessionId,
          description: `Transcription queued for session ${request.sessionId}`,
          metadata: {
            audioFilePath: request.audioFilePath,
            audioFormat: request.audioFormat,
            model: request.options?.model || this.defaultModel,
            priority: request.priority || 100,
          },
        });

        return {
          queueItemId: queueItem.id,
          transcriptionId: transcription.id,
        };
      });

      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enqueue transcription',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<WhisperServiceResponse<{
    pending: number;
    processing: number;
    total: number;
    items: QueueItem[];
  }>> {
    const startTime = Date.now();

    try {
      const items = await db.query.transcriptionQueue.findMany({
        orderBy: [asc(transcriptionQueue.priority), asc(transcriptionQueue.createdAt)],
      });

      const pending = items.filter(i => !i.isProcessing).length;
      const processing = items.filter(i => i.isProcessing).length;

      return {
        success: true,
        data: {
          pending,
          processing,
          total: items.length,
          items: items as QueueItem[],
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get queue status',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Start queue processing
   */
  startQueueProcessing(options?: QueueProcessingOptions): void {
    if (this.processingInterval) {
      return; // Already running
    }

    const pollInterval = options?.pollIntervalMs || whisperConfig.queuePollIntervalMs;
    const workerId = options?.workerId || `worker-${randomUUID().slice(0, 8)}`;

    this.isProcessingQueue = true;

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessingQueue) {
        return;
      }

      try {
        await this.processNextInQueue(workerId, options);
      } catch (error) {
        console.error('Queue processing error:', error);
      }
    }, pollInterval);

    // Process immediately on start
    this.processNextInQueue(workerId, options).catch(console.error);
  }

  /**
   * Stop queue processing
   */
  stopQueueProcessing(): void {
    this.isProcessingQueue = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Cancel any active jobs
    for (const [sessionId, controller] of this.activeJobs) {
      controller.abort();
      this.activeJobs.delete(sessionId);
    }
  }

  /**
   * Process next item in queue
   */
  private async processNextInQueue(
    workerId: string,
    options?: QueueProcessingOptions
  ): Promise<void> {
    const maxConcurrent = options?.maxConcurrent || whisperConfig.queueMaxConcurrent;

    // Check if we can process more jobs
    if (this.activeJobs.size >= maxConcurrent) {
      return;
    }

    // Try to acquire a queue item
    const queueItem = await this.acquireQueueItem(workerId, options);
    if (!queueItem) {
      return;
    }

    // Get session info
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, queueItem.sessionId),
    });

    if (!session) {
      await this.failQueueItem(queueItem.id, 'Session not found');
      return;
    }

    // Create abort controller for this job
    const controller = new AbortController();
    this.activeJobs.set(queueItem.sessionId, controller);

    try {
      // Process transcription
      const result = await this.processTranscription(
        queueItem.sessionId,
        session.audioFilePath,
        queueItem,
        (progress) => {
          // Progress callback - could emit events or update database
          this.updateProgress(queueItem.sessionId, progress).catch(console.error);
        }
      );

      // Complete queue item
      await this.completeQueueItem(queueItem.id, result);
    } catch (error) {
      // Handle error
      await this.handleProcessingError(queueItem, error);
    } finally {
      this.activeJobs.delete(queueItem.sessionId);
    }
  }

  /**
   * Acquire a queue item with lock
   */
  private async acquireQueueItem(
    workerId: string,
    options?: QueueProcessingOptions
  ): Promise<QueueItem | null> {
    const lockDuration = options?.lockDurationMs || whisperConfig.queueLockDurationMs;
    const now = new Date();
    const lockExpiry = new Date(now.getTime() + lockDuration);

    try {
      // Find and lock an available queue item
      const result = await db.transaction(async (tx) => {
        // Find next available item
        const items = await tx
          .select()
          .from(transcriptionQueue)
          .where(
            and(
              eq(transcriptionQueue.isProcessing, false),
              or(
                isNull(transcriptionQueue.lockedUntil),
                lt(transcriptionQueue.lockedUntil, now)
              ),
              lt(transcriptionQueue.attempts, transcriptionQueue.maxAttempts),
              lt(transcriptionQueue.scheduledFor, now)
            )
          )
          .orderBy(asc(transcriptionQueue.priority), asc(transcriptionQueue.createdAt))
          .limit(1);

        if (items.length === 0) {
          return null;
        }

        const item = items[0];

        // Try to acquire lock
        const updated = await tx
          .update(transcriptionQueue)
          .set({
            isProcessing: true,
            lockedUntil: lockExpiry,
            lockedBy: workerId,
            attempts: sql`${transcriptionQueue.attempts} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(transcriptionQueue.id, item.id),
              eq(transcriptionQueue.isProcessing, false)
            )
          )
          .returning();

        return updated.length > 0 ? updated[0] : null;
      });

      return result as QueueItem | null;
    } catch (error) {
      console.error('Failed to acquire queue item:', error);
      return null;
    }
  }

  /**
   * Process a single transcription
   */
  private async processTranscription(
    sessionId: string,
    audioFilePath: string,
    queueItem: QueueItem,
    onProgress?: ProgressCallback
  ): Promise<TranscriptionCompletionResult> {
    const startTime = Date.now();

    // Get transcription record
    const transcription = await db.query.transcriptions.findFirst({
      where: eq(transcriptions.sessionId, sessionId),
    });

    if (!transcription) {
      throw new WhisperQueueError('Transcription record not found', sessionId);
    }

    // Update status to processing
    await db
      .update(transcriptions)
      .set({
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transcriptions.id, transcription.id));

    // Perform transcription
    const result = await this.client.transcribe(
      audioFilePath,
      { model: transcription.modelUsed || this.defaultModel },
      onProgress,
      sessionId
    );

    const processingDuration = Date.now() - startTime;

    // Store results in database
    await db.transaction(async (tx) => {
      // Update transcription record
      await tx
        .update(transcriptions)
        .set({
          status: 'completed',
          fullText: result.text,
          languageDetected: result.language,
          processingDurationMs: processingDuration,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(transcriptions.id, transcription.id));

      // Insert segments
      if (result.segments.length > 0) {
        await tx.insert(transcriptionSegments).values(
          result.segments.map((seg, idx) => ({
            transcriptionId: transcription.id,
            segmentIndex: idx,
            text: seg.text,
            startTime: seg.start,
            endTime: seg.end,
            confidence: 1 - seg.noSpeechProb, // Convert to confidence
            lowConfidence: seg.noSpeechProb > 0.5,
            wordTimings: seg.words ? JSON.stringify(seg.words) : null,
          }))
        );
      }

      // Update session status
      await tx
        .update(sessions)
        .set({
          status: 'transcribed',
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));

      // Log audit entry
      await tx.insert(auditLogs).values({
        action: 'transcription_completed',
        severity: 'info',
        actorType: 'system',
        resourceType: 'transcription',
        resourceId: transcription.id,
        sessionId,
        description: `Transcription completed for session ${sessionId}`,
        metadata: {
          language: result.language,
          duration: result.duration,
          segmentsCount: result.segments.length,
          processingTimeMs: processingDuration,
        },
        durationMs: processingDuration,
      });

      // Record metrics
      await tx.insert(processingMetrics).values([
        {
          sessionId,
          metricType: 'transcription_duration',
          component: 'whisper',
          value: processingDuration,
          unit: 'milliseconds',
          labels: { model: transcription.modelUsed || this.defaultModel },
        },
        {
          sessionId,
          metricType: 'audio_duration',
          component: 'whisper',
          value: Math.round(result.duration * 1000),
          unit: 'milliseconds',
        },
      ]);
    });

    return {
      transcriptionId: transcription.id,
      sessionId,
      status: 'completed',
      fullText: result.text,
      segmentsCount: result.segments.length,
      language: result.language,
      processingDurationMs: processingDuration,
    };
  }

  /**
   * Complete queue item successfully
   */
  private async completeQueueItem(
    queueItemId: string,
    result: TranscriptionCompletionResult
  ): Promise<void> {
    await db
      .delete(transcriptionQueue)
      .where(eq(transcriptionQueue.id, queueItemId));
  }

  /**
   * Fail queue item
   */
  private async failQueueItem(queueItemId: string, error: string): Promise<void> {
    const queueItem = await db.query.transcriptionQueue.findFirst({
      where: eq(transcriptionQueue.id, queueItemId),
    });

    if (!queueItem) return;

    await db
      .update(transcriptionQueue)
      .set({
        isProcessing: false,
        lockedUntil: null,
        lockedBy: null,
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(transcriptionQueue.id, queueItemId));
  }

  /**
   * Handle processing error
   */
  private async handleProcessingError(
    queueItem: QueueItem,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const canRetry = isRetryableError(error) && queueItem.attempts < queueItem.maxAttempts;
    const severity = getErrorSeverity(error);

    // Update transcription status
    const transcription = await db.query.transcriptions.findFirst({
      where: eq(transcriptions.sessionId, queueItem.sessionId),
    });

    if (transcription) {
      await db.transaction(async (tx) => {
        const newStatus: TranscriptionStatus = canRetry ? 'retrying' : 'failed';

        await tx
          .update(transcriptions)
          .set({
            status: newStatus,
            errorMessage,
            retryCount: sql`${transcriptions.retryCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(transcriptions.id, transcription.id));

        // Update session status if failed permanently
        if (!canRetry) {
          await tx
            .update(sessions)
            .set({
              status: 'failed',
              errorMessage,
              updatedAt: new Date(),
            })
            .where(eq(sessions.id, queueItem.sessionId));
        }

        // Log audit entry
        await tx.insert(auditLogs).values({
          action: canRetry ? 'transcription_retried' : 'transcription_failed',
          severity,
          actorType: 'system',
          resourceType: 'transcription',
          resourceId: transcription.id,
          sessionId: queueItem.sessionId,
          description: canRetry
            ? `Transcription retry scheduled for session ${queueItem.sessionId}: ${errorMessage}`
            : `Transcription failed for session ${queueItem.sessionId}: ${errorMessage}`,
          metadata: {
            attempts: queueItem.attempts,
            maxAttempts: queueItem.maxAttempts,
            errorCode: isWhisperError(error) ? error.code : undefined,
            retryable: canRetry,
          },
        });
      });
    }

    // Update queue item
    if (canRetry) {
      // Schedule retry with exponential backoff
      const retryDelay = whisperConfig.retryDelay * Math.pow(2, queueItem.attempts - 1);
      const scheduledFor = new Date(Date.now() + retryDelay);

      await db
        .update(transcriptionQueue)
        .set({
          isProcessing: false,
          lockedUntil: null,
          lockedBy: null,
          lastError: errorMessage,
          scheduledFor,
          updatedAt: new Date(),
        })
        .where(eq(transcriptionQueue.id, queueItem.id));
    } else {
      // Remove from queue - max retries exceeded
      await db
        .delete(transcriptionQueue)
        .where(eq(transcriptionQueue.id, queueItem.id));

      // Throw max retries error for logging
      if (queueItem.attempts >= queueItem.maxAttempts) {
        console.error(
          new WhisperMaxRetriesError(
            queueItem.sessionId,
            queueItem.attempts,
            queueItem.maxAttempts,
            errorMessage
          )
        );
      }
    }
  }

  /**
   * Update progress (could emit events or update database)
   */
  private async updateProgress(
    sessionId: string,
    progress: TranscriptionProgress
  ): Promise<void> {
    // This could be extended to:
    // - Store progress in Redis for real-time updates
    // - Emit WebSocket events
    // - Update a progress table

    // For now, just log significant progress updates
    if (progress.progress % 25 === 0) {
      console.log(`Transcription progress for ${sessionId}: ${progress.progress}%`);
    }
  }

  /**
   * Get transcription by session ID
   */
  async getTranscription(
    sessionId: string
  ): Promise<WhisperServiceResponse<{
    transcription: typeof transcriptions.$inferSelect;
    segments: (typeof transcriptionSegments.$inferSelect)[];
  } | null>> {
    const startTime = Date.now();

    try {
      const transcription = await db.query.transcriptions.findFirst({
        where: eq(transcriptions.sessionId, sessionId),
        with: {
          segments: {
            orderBy: [asc(transcriptionSegments.segmentIndex)],
          },
        },
      });

      return {
        success: true,
        data: transcription
          ? {
              transcription,
              segments: transcription.segments,
            }
          : null,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transcription',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Cancel a pending transcription
   */
  async cancelTranscription(sessionId: string): Promise<WhisperServiceResponse<boolean>> {
    const startTime = Date.now();

    try {
      // Check if actively processing
      const controller = this.activeJobs.get(sessionId);
      if (controller) {
        controller.abort();
        this.activeJobs.delete(sessionId);
      }

      await db.transaction(async (tx) => {
        // Remove from queue
        await tx
          .delete(transcriptionQueue)
          .where(eq(transcriptionQueue.sessionId, sessionId));

        // Update transcription status
        await tx
          .update(transcriptions)
          .set({
            status: 'failed',
            errorMessage: 'Cancelled by user',
            updatedAt: new Date(),
          })
          .where(eq(transcriptions.sessionId, sessionId));

        // Update session status
        await tx
          .update(sessions)
          .set({
            status: 'failed',
            errorMessage: 'Transcription cancelled',
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));

        // Log audit entry
        const transcription = await tx.query.transcriptions.findFirst({
          where: eq(transcriptions.sessionId, sessionId),
        });

        if (transcription) {
          await tx.insert(auditLogs).values({
            action: 'transcription_failed',
            severity: 'info',
            actorType: 'user',
            resourceType: 'transcription',
            resourceId: transcription.id,
            sessionId,
            description: `Transcription cancelled for session ${sessionId}`,
          });
        }
      });

      return {
        success: true,
        data: true,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel transcription',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Retry a failed transcription
   */
  async retryTranscription(sessionId: string): Promise<WhisperServiceResponse<boolean>> {
    const startTime = Date.now();

    try {
      const transcription = await db.query.transcriptions.findFirst({
        where: eq(transcriptions.sessionId, sessionId),
      });

      if (!transcription) {
        return {
          success: false,
          error: 'Transcription not found',
          processingTime: Date.now() - startTime,
        };
      }

      if (transcription.status !== 'failed') {
        return {
          success: false,
          error: `Cannot retry transcription with status: ${transcription.status}`,
          processingTime: Date.now() - startTime,
        };
      }

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      });

      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          processingTime: Date.now() - startTime,
        };
      }

      await db.transaction(async (tx) => {
        // Reset transcription status
        await tx
          .update(transcriptions)
          .set({
            status: 'queued',
            errorMessage: null,
            startedAt: null,
            completedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(transcriptions.id, transcription.id));

        // Add back to queue
        await tx.insert(transcriptionQueue).values({
          sessionId,
          priority: 50, // Higher priority for retries
          attempts: 0, // Reset attempts
          scheduledFor: new Date(),
        });

        // Update session status
        await tx
          .update(sessions)
          .set({
            status: 'transcribing',
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId));

        // Log audit entry
        await tx.insert(auditLogs).values({
          action: 'transcription_retried',
          severity: 'info',
          actorType: 'user',
          resourceType: 'transcription',
          resourceId: transcription.id,
          sessionId,
          description: `Manual retry requested for session ${sessionId}`,
        });
      });

      return {
        success: true,
        data: true,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry transcription',
        processingTime: Date.now() - startTime,
      };
    }
  }
}

// Default singleton instance
export const whisperService = new WhisperService();
