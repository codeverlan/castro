/**
 * Recordings API Routes
 * POST /api/recordings - Create recording and get presigned upload URL
 * GET /api/recordings - List recordings with optional filters
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { sessionRecordings, s3Credentials, sessions } from '~/db/schema';
import {
  createRecordingSchema,
  recordingQuerySchema,
} from '~/lib/validations/recordings';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';
import { and, eq, desc, sql } from 'drizzle-orm';
import {
  generatePresignedUploadUrl,
  generateRecordingKey,
  getExtensionFromMimeType,
} from '~/services/s3';

export const Route = createFileRoute('/api/recordings/')({
  server: {
    handlers: {
      /**
       * POST /api/recordings
       * Create a new recording entry and get presigned upload URL
       *
       * Request body:
       * - source: 'browser_dictation' | 'file_upload' (required)
       * - contentType: string (required) - MIME type of the audio file
       * - fileSize: number (optional) - Expected file size in bytes
       * - sessionId: string (optional) - Session to attach to (required for browser_dictation)
       * - originalFilename: string (optional) - Original filename
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate request body
          const validatedData = createRecordingSchema.parse(body);

          // Get the default S3 credential profile
          const defaultCredential = await db.query.s3Credentials.findFirst({
            where: eq(s3Credentials.isDefault, true),
          });

          if (!defaultCredential) {
            throw new ValidationError(
              'No default S3 credential profile configured. Please set up S3 credentials first.'
            );
          }

          if (!defaultCredential.defaultBucket) {
            throw new ValidationError(
              'Default S3 credential profile does not have a default bucket configured.'
            );
          }

          // Verify session exists if sessionId is provided
          if (validatedData.sessionId) {
            const session = await db.query.sessions.findFirst({
              where: eq(sessions.id, validatedData.sessionId),
            });

            if (!session) {
              throw new NotFoundError(`Session with ID '${validatedData.sessionId}' not found`);
            }
          }

          // Generate recording ID and S3 key
          const recordingId = crypto.randomUUID();
          const extension = getExtensionFromMimeType(validatedData.contentType);
          const s3Key = generateRecordingKey({
            recordingId,
            extension,
          });

          // Generate presigned upload URL (1 hour expiration)
          const presignedResult = await generatePresignedUploadUrl(defaultCredential, {
            bucket: defaultCredential.defaultBucket,
            key: s3Key,
            contentType: validatedData.contentType,
            expiresIn: 3600,
          });

          if (!presignedResult.success || !presignedResult.data) {
            throw new Error(presignedResult.error || 'Failed to generate presigned URL');
          }

          // Create recording record in database
          const [newRecording] = await db
            .insert(sessionRecordings)
            .values({
              id: recordingId,
              sessionId: validatedData.sessionId || null,
              s3CredentialId: defaultCredential.id,
              s3Bucket: defaultCredential.defaultBucket,
              s3Key,
              s3Region: defaultCredential.region,
              source: validatedData.source,
              status: 'uploading',
              originalFilename: validatedData.originalFilename || null,
              mimeType: validatedData.contentType,
              fileSize: validatedData.fileSize || null,
              uploadUrl: presignedResult.data.uploadUrl,
              uploadUrlExpiresAt: presignedResult.data.expiresAt,
              recordedAt: validatedData.source === 'browser_dictation' ? new Date() : null,
            })
            .returning();

          return Response.json(
            {
              data: {
                recordingId: newRecording.id,
                uploadUrl: presignedResult.data.uploadUrl,
                uploadUrlExpiresAt: presignedResult.data.expiresAt.toISOString(),
                s3Bucket: newRecording.s3Bucket,
                s3Key: newRecording.s3Key,
              },
            },
            { status: 201 }
          );
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * GET /api/recordings
       * List recordings with optional filtering
       *
       * Query parameters:
       * - sessionId: string (optional) - Filter by session
       * - source: 'browser_dictation' | 'file_upload' (optional) - Filter by source
       * - status: string (optional) - Filter by status
       * - limit: number (optional, default 50) - Page size
       * - offset: number (optional, default 0) - Page offset
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const queryParams = {
            sessionId: url.searchParams.get('sessionId') || undefined,
            source: url.searchParams.get('source') || undefined,
            status: url.searchParams.get('status') || undefined,
            limit: url.searchParams.get('limit') || '50',
            offset: url.searchParams.get('offset') || '0',
          };

          // Validate query parameters
          const validatedQuery = recordingQuerySchema.parse(queryParams);

          // Build where conditions
          const conditions = [];

          if (validatedQuery.sessionId) {
            conditions.push(eq(sessionRecordings.sessionId, validatedQuery.sessionId));
          }

          if (validatedQuery.source) {
            conditions.push(eq(sessionRecordings.source, validatedQuery.source));
          }

          if (validatedQuery.status) {
            conditions.push(eq(sessionRecordings.status, validatedQuery.status));
          }

          // Query recordings
          const recordings = await db.query.sessionRecordings.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            limit: validatedQuery.limit,
            offset: validatedQuery.offset,
            orderBy: [desc(sessionRecordings.createdAt)],
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

          // Get total count for pagination
          const countResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(sessionRecordings)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

          const total = countResult[0]?.count || 0;

          // Remove sensitive URL from response (it may have expired)
          const sanitizedRecordings = recordings.map((rec) => ({
            ...rec,
            uploadUrl: null, // Don't expose presigned URLs in list
          }));

          return Response.json({
            data: sanitizedRecordings,
            pagination: {
              total,
              limit: validatedQuery.limit,
              offset: validatedQuery.offset,
              hasMore: validatedQuery.offset + recordings.length < total,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
