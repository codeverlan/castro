/**
 * Attach Recording to Session API Route
 * POST /api/recordings/:id/attach - Link recording to a session
 * Auto-triggers transcription after attaching
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessionRecordings, sessions } from '~/db/schema';
import { attachRecordingSchema } from '~/lib/validations/recordings';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';
import { eq } from 'drizzle-orm';
import { triggerTranscription } from '~/services/transcription';

export const Route = createFileRoute('/api/recordings/$id/attach')({
  server: {
    handlers: {
      /**
       * POST /api/recordings/:id/attach
       * Attach recording to a session
       *
       * Request body:
       * - sessionId: string (required) - Session ID to attach to
       */
      POST: async ({ request, params }) => {
        try {
          const { id } = params;
          const body = await request.json();

          // Validate request body
          const validatedData = attachRecordingSchema.parse(body);

          // Get recording
          const recording = await db.query.sessionRecordings.findFirst({
            where: eq(sessionRecordings.id, id),
          });

          if (!recording) {
            throw new NotFoundError(`Recording with ID '${id}' not found`);
          }

          // Check recording status
          if (recording.status === 'uploading') {
            throw new ValidationError(
              'Cannot attach recording that is still uploading. Complete the upload first.'
            );
          }

          if (recording.status === 'failed') {
            throw new ValidationError('Cannot attach a failed recording.');
          }

          // Verify session exists
          const session = await db.query.sessions.findFirst({
            where: eq(sessions.id, validatedData.sessionId),
          });

          if (!session) {
            throw new NotFoundError(`Session with ID '${validatedData.sessionId}' not found`);
          }

          // Update recording with session attachment
          const [updatedRecording] = await db
            .update(sessionRecordings)
            .set({
              sessionId: validatedData.sessionId,
              status: 'attached',
              updatedAt: new Date(),
            })
            .where(eq(sessionRecordings.id, id))
            .returning();

          // Auto-trigger transcription after attaching to session
          const transcriptionResult = await triggerTranscription(id);

          return Response.json({
            data: {
              ...updatedRecording,
              uploadUrl: null,
              transcription: transcriptionResult.success
                ? {
                    triggered: true,
                    queueItemId: transcriptionResult.queueItemId,
                    transcriptionId: transcriptionResult.transcriptionId,
                  }
                : { triggered: false, error: transcriptionResult.error },
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
