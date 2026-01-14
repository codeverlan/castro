/**
 * Individual Recording API Routes
 * GET /api/recordings/:id - Get recording details
 * DELETE /api/recordings/:id - Delete recording
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessionRecordings, s3Credentials } from '~/db/schema';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq } from 'drizzle-orm';
import {
  generatePresignedDownloadUrl,
  deleteFromS3,
} from '~/services/s3';

export const Route = createFileRoute('/api/recordings/$id')({
  server: {
    handlers: {
      /**
       * GET /api/recordings/:id
       * Get recording details with optional download URL
       *
       * Query parameters:
       * - includeDownloadUrl: boolean (optional) - Include presigned download URL
       */
      GET: async ({ request, params }) => {
        try {
          const { id } = params;
          const url = new URL(request.url);
          const includeDownloadUrl = url.searchParams.get('includeDownloadUrl') === 'true';

          // Get recording with session info
          const recording = await db.query.sessionRecordings.findFirst({
            where: eq(sessionRecordings.id, id),
            with: {
              session: {
                columns: {
                  id: true,
                  status: true,
                  audioFilePath: true,
                  createdAt: true,
                },
              },
            },
          });

          if (!recording) {
            throw new NotFoundError(`Recording with ID '${id}' not found`);
          }

          // Generate download URL if requested and recording is uploaded
          let downloadUrl: string | null = null;
          let downloadUrlExpiresAt: string | null = null;

          if (includeDownloadUrl && recording.status !== 'uploading' && recording.status !== 'failed') {
            // Get S3 credentials
            const credential = await db.query.s3Credentials.findFirst({
              where: eq(s3Credentials.id, recording.s3CredentialId),
            });

            if (credential) {
              const downloadResult = await generatePresignedDownloadUrl(credential, {
                bucket: recording.s3Bucket,
                key: recording.s3Key,
                expiresIn: 3600, // 1 hour
                filename: recording.originalFilename || `recording-${recording.id}.${recording.mimeType.split('/')[1]}`,
              });

              if (downloadResult.success && downloadResult.data) {
                downloadUrl = downloadResult.data.downloadUrl;
                downloadUrlExpiresAt = downloadResult.data.expiresAt.toISOString();
              }
            }
          }

          return Response.json({
            data: {
              ...recording,
              uploadUrl: null, // Don't expose upload URL
              downloadUrl,
              downloadUrlExpiresAt,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * DELETE /api/recordings/:id
       * Delete recording from database and S3
       */
      DELETE: async ({ params }) => {
        try {
          const { id } = params;

          // Get recording
          const recording = await db.query.sessionRecordings.findFirst({
            where: eq(sessionRecordings.id, id),
          });

          if (!recording) {
            throw new NotFoundError(`Recording with ID '${id}' not found`);
          }

          // Get S3 credentials to delete from S3
          const credential = await db.query.s3Credentials.findFirst({
            where: eq(s3Credentials.id, recording.s3CredentialId),
          });

          // Try to delete from S3 (don't fail if S3 delete fails)
          if (credential && recording.status !== 'uploading') {
            try {
              await deleteFromS3(credential, recording.s3Bucket, recording.s3Key);
            } catch (s3Error) {
              console.warn(`Failed to delete recording from S3: ${s3Error}`);
              // Continue with database deletion even if S3 delete fails
            }
          }

          // Delete from database
          await db
            .delete(sessionRecordings)
            .where(eq(sessionRecordings.id, id));

          return Response.json({
            data: { deleted: true, id },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
