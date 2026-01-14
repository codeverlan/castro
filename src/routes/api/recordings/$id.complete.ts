/**
 * Complete Recording Upload API Route
 * POST /api/recordings/:id/complete - Mark recording upload as complete
 * Auto-triggers transcription if recording is attached to a session
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessionRecordings, s3Credentials } from '~/db/schema';
import { completeUploadSchema } from '~/lib/validations/recordings';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';
import { eq } from 'drizzle-orm';
import { getObjectInfo } from '~/services/s3';
import { triggerTranscription } from '~/services/transcription';

export const Route = createFileRoute('/api/recordings/$id/complete')({
  server: {
    handlers: {
      /**
       * POST /api/recordings/:id/complete
       * Mark recording upload as complete and update metadata
       *
       * Request body:
       * - duration: number (optional) - Recording duration in seconds
       * - fileSize: number (optional) - Actual file size in bytes
       */
      POST: async ({ request, params }) => {
        try {
          const { id } = params;
          const body = await request.json();

          // Validate request body
          const validatedData = completeUploadSchema.parse(body);

          // Get recording
          const recording = await db.query.sessionRecordings.findFirst({
            where: eq(sessionRecordings.id, id),
          });

          if (!recording) {
            throw new NotFoundError(`Recording with ID '${id}' not found`);
          }

          if (recording.status !== 'uploading') {
            throw new ValidationError(
              `Recording is already in status '${recording.status}'. Can only complete uploads in 'uploading' status.`
            );
          }

          // Get S3 credentials to verify upload
          const credential = await db.query.s3Credentials.findFirst({
            where: eq(s3Credentials.id, recording.s3CredentialId),
          });

          if (!credential) {
            throw new ValidationError('S3 credential profile not found');
          }

          // Verify the file exists in S3
          const objectInfo = await getObjectInfo(
            credential,
            recording.s3Bucket,
            recording.s3Key
          );

          if (!objectInfo.success) {
            throw new ValidationError(`Failed to verify upload: ${objectInfo.error}`);
          }

          if (!objectInfo.data?.exists) {
            throw new ValidationError(
              'Upload not found in S3. Please ensure the file was uploaded successfully.'
            );
          }

          // Update recording with complete status and metadata
          const [updatedRecording] = await db
            .update(sessionRecordings)
            .set({
              status: recording.sessionId ? 'attached' : 'ready',
              fileSize: validatedData.fileSize || objectInfo.data.contentLength || recording.fileSize,
              duration: validatedData.duration || recording.duration,
              uploadedAt: new Date(),
              uploadUrl: null, // Clear the presigned URL
              uploadUrlExpiresAt: null,
              updatedAt: new Date(),
            })
            .where(eq(sessionRecordings.id, id))
            .returning();

          // Auto-trigger transcription if recording is attached to a session
          let transcriptionResult = null;
          if (updatedRecording.sessionId) {
            transcriptionResult = await triggerTranscription(id);
          }

          return Response.json({
            data: {
              ...updatedRecording,
              uploadUrl: null,
              transcription: transcriptionResult?.success
                ? {
                    triggered: true,
                    queueItemId: transcriptionResult.queueItemId,
                    transcriptionId: transcriptionResult.transcriptionId,
                  }
                : transcriptionResult
                  ? { triggered: false, error: transcriptionResult.error }
                  : null,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
