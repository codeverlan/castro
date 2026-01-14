/**
 * Transcription Trigger Service
 * Handles triggering transcription after recording upload completes
 * Downloads recording from S3 to local storage and enqueues Whisper transcription
 */

import { eq } from 'drizzle-orm';
import { join } from 'node:path';
import { db } from '~/db';
import { sessionRecordings, sessions, s3Credentials, auditLogs } from '~/db/schema';
import { downloadFromS3ToFile } from '~/services/s3';
import { whisperService, whisperConfig } from '~/services/whisper';
import type { AudioFormat } from '~/services/whisper';

// Configuration for local audio storage
const AUDIO_STORAGE_PATH = process.env.AUDIO_STORAGE_PATH || '/data/audio';

export interface TriggerTranscriptionResult {
  success: boolean;
  queueItemId?: string;
  transcriptionId?: string;
  localFilePath?: string;
  error?: string;
}

/**
 * Map MIME type to AudioFormat for Whisper
 */
function mimeTypeToAudioFormat(mimeType: string): AudioFormat | null {
  const mapping: Record<string, AudioFormat> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
  };
  return mapping[mimeType.toLowerCase()] || null;
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/x-wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/m4a': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/ogg': '.ogg',
    'audio/webm': '.webm',
  };
  return extensions[mimeType.toLowerCase()] || '.audio';
}

/**
 * Trigger transcription for a recording
 * Downloads from S3 to local storage and enqueues Whisper job
 * @param recordingId - Recording ID to transcribe
 * @returns Trigger result with queue/transcription IDs
 */
export async function triggerTranscription(
  recordingId: string
): Promise<TriggerTranscriptionResult> {
  try {
    // 1. Get recording with session and S3 credentials
    const recording = await db.query.sessionRecordings.findFirst({
      where: eq(sessionRecordings.id, recordingId),
    });

    if (!recording) {
      return { success: false, error: `Recording not found: ${recordingId}` };
    }

    // 2. Verify recording has a session
    if (!recording.sessionId) {
      return { success: false, error: 'Recording is not attached to a session' };
    }

    // 3. Verify recording status allows transcription
    if (recording.status !== 'attached' && recording.status !== 'ready') {
      return {
        success: false,
        error: `Cannot transcribe recording in status: ${recording.status}`,
      };
    }

    // 4. Get the session
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, recording.sessionId),
    });

    if (!session) {
      return { success: false, error: `Session not found: ${recording.sessionId}` };
    }

    // 5. Check if session is already being processed
    if (session.status !== 'pending') {
      return {
        success: false,
        error: `Session is already in status: ${session.status}. Cannot start new transcription.`,
      };
    }

    // 6. Get S3 credentials
    const credential = await db.query.s3Credentials.findFirst({
      where: eq(s3Credentials.id, recording.s3CredentialId),
    });

    if (!credential) {
      return { success: false, error: 'S3 credentials not found' };
    }

    // 7. Determine local file path
    const extension = getExtensionFromMimeType(recording.mimeType);
    const localFilePath = join(
      AUDIO_STORAGE_PATH,
      'recordings',
      recording.sessionId,
      `${recording.id}${extension}`
    );

    // 8. Download file from S3
    const downloadResult = await downloadFromS3ToFile(credential, {
      bucket: recording.s3Bucket,
      key: recording.s3Key,
      localPath: localFilePath,
    });

    if (!downloadResult.success) {
      // Log audit entry for failed download
      await db.insert(auditLogs).values({
        action: 'transcription_download_failed',
        severity: 'error',
        actorType: 'system',
        resourceType: 'recording',
        resourceId: recording.id,
        sessionId: recording.sessionId,
        description: `Failed to download recording from S3: ${downloadResult.error}`,
        metadata: {
          bucket: recording.s3Bucket,
          key: recording.s3Key,
        },
      });

      return {
        success: false,
        error: `Failed to download from S3: ${downloadResult.error}`,
      };
    }

    // 9. Update session with local audio file path
    await db
      .update(sessions)
      .set({
        audioFilePath: localFilePath,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, recording.sessionId));

    // 10. Determine audio format for Whisper
    const audioFormat = mimeTypeToAudioFormat(recording.mimeType);
    if (!audioFormat) {
      return {
        success: false,
        error: `Unsupported audio format: ${recording.mimeType}`,
      };
    }

    // 11. Enqueue transcription job
    const enqueueResult = await whisperService.enqueue({
      sessionId: recording.sessionId,
      audioFilePath: localFilePath,
      audioFormat,
      priority: 100, // Default priority
    });

    if (!enqueueResult.success) {
      return {
        success: false,
        error: `Failed to enqueue transcription: ${enqueueResult.error}`,
      };
    }

    // 12. Log successful trigger
    await db.insert(auditLogs).values({
      action: 'transcription_triggered',
      severity: 'info',
      actorType: 'system',
      resourceType: 'recording',
      resourceId: recording.id,
      sessionId: recording.sessionId,
      description: `Transcription triggered for recording ${recording.id}`,
      metadata: {
        localFilePath,
        audioFormat,
        queueItemId: enqueueResult.data?.queueItemId,
        transcriptionId: enqueueResult.data?.transcriptionId,
      },
    });

    return {
      success: true,
      queueItemId: enqueueResult.data?.queueItemId,
      transcriptionId: enqueueResult.data?.transcriptionId,
      localFilePath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log error
    await db.insert(auditLogs).values({
      action: 'transcription_trigger_failed',
      severity: 'error',
      actorType: 'system',
      resourceType: 'recording',
      resourceId: recordingId,
      description: `Failed to trigger transcription: ${errorMessage}`,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Check if a recording is eligible for transcription
 * @param recordingId - Recording ID to check
 * @returns True if eligible
 */
export async function isEligibleForTranscription(recordingId: string): Promise<boolean> {
  const recording = await db.query.sessionRecordings.findFirst({
    where: eq(sessionRecordings.id, recordingId),
  });

  if (!recording) return false;
  if (!recording.sessionId) return false;
  if (recording.status !== 'attached' && recording.status !== 'ready') return false;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, recording.sessionId),
  });

  if (!session) return false;
  if (session.status !== 'pending') return false;

  return true;
}
