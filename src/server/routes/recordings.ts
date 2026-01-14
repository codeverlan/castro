/**
 * Recordings API Routes
 * Hono router for recording management
 */

import { Hono } from 'hono';
import { db } from '~/db';
import { sessionRecordings, s3Credentials, sessions } from '~/db/schema';
import {
  createRecordingSchema,
  recordingQuerySchema,
  completeUploadSchema,
} from '~/lib/validations/recordings';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';
import { and, eq, desc, sql } from 'drizzle-orm';
import {
  generatePresignedUploadUrl,
  generateRecordingKey,
  getExtensionFromMimeType,
  getObjectInfo,
} from '~/services/s3';
import { triggerTranscription } from '~/services/transcription';

export const recordingsRouter = new Hono();

/**
 * POST /api/recordings
 * Create a new recording entry and get presigned upload URL
 */
recordingsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();

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
        throw new NotFoundError(
          `Session with ID '${validatedData.sessionId}' not found`
        );
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
        recordedAt:
          validatedData.source === 'browser_dictation' ? new Date() : null,
      })
      .returning();

    return c.json(
      {
        data: {
          recordingId: newRecording.id,
          uploadUrl: presignedResult.data.uploadUrl,
          uploadUrlExpiresAt: presignedResult.data.expiresAt.toISOString(),
          s3Bucket: newRecording.s3Bucket,
          s3Key: newRecording.s3Key,
        },
      },
      201
    );
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/recordings
 * List recordings with optional filtering
 */
recordingsRouter.get('/', async (c) => {
  try {
    const queryParams = {
      sessionId: c.req.query('sessionId') || undefined,
      source: c.req.query('source') || undefined,
      status: c.req.query('status') || undefined,
      limit: c.req.query('limit') || '50',
      offset: c.req.query('offset') || '0',
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

    return c.json({
      data: sanitizedRecordings,
      pagination: {
        total,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: validatedQuery.offset + recordings.length < total,
      },
    });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/recordings/:id
 * Get a single recording by ID
 */
recordingsRouter.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const recording = await db.query.sessionRecordings.findFirst({
      where: eq(sessionRecordings.id, id),
      with: {
        session: true,
      },
    });

    if (!recording) {
      throw new NotFoundError(`Recording with ID '${id}' not found`);
    }

    return c.json({
      data: {
        ...recording,
        uploadUrl: null, // Don't expose presigned URL
      },
    });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * POST /api/recordings/:id/complete
 * Mark recording upload as complete and update metadata
 */
recordingsRouter.post('/:id/complete', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

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
        fileSize:
          validatedData.fileSize ||
          objectInfo.data.contentLength ||
          recording.fileSize,
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

    return c.json({
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
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * POST /api/recordings/:id/attach
 * Attach a recording to a session
 */
recordingsRouter.post('/:id/attach', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const { sessionId } = body;

    if (!sessionId) {
      throw new ValidationError('sessionId is required');
    }

    // Get recording
    const recording = await db.query.sessionRecordings.findFirst({
      where: eq(sessionRecordings.id, id),
    });

    if (!recording) {
      throw new NotFoundError(`Recording with ID '${id}' not found`);
    }

    // Verify session exists
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      throw new NotFoundError(`Session with ID '${sessionId}' not found`);
    }

    // Update recording
    const [updatedRecording] = await db
      .update(sessionRecordings)
      .set({
        sessionId,
        status: recording.status === 'ready' ? 'attached' : recording.status,
        updatedAt: new Date(),
      })
      .where(eq(sessionRecordings.id, id))
      .returning();

    return c.json({ data: updatedRecording });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});
