/**
 * POST /api/s3-credentials/test/$id
 * Test S3 connection for a credential profile
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { s3Credentials } from '~/db/schema';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq } from 'drizzle-orm';
import { testS3Connection } from '~/services/s3/service';

export const Route = createFileRoute('/api/s3-credentials/test/$id')({
  server: {
    handlers: {
      /**
       * POST /api/s3-credentials/test/$id
       * Test S3 connection for a credential profile
       */
      POST: async ({ request, params }) => {
        const { id } = params;
        const startTime = Date.now();

        try {
          // Validate ID format
          if (!id || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
            throw new Error('Invalid credential ID format');
          }

          // Get credential profile
          const credential = await db.query.s3Credentials.findFirst({
            where: eq(s3Credentials.id, id),
          });

          if (!credential) {
            throw new NotFoundError('S3 credential profile not found');
          }

          // Parse request body for test options
          const body = await request.json().catch(() => ({}));
          const options = {
            checkPermissions: body.checkPermissions !== false,
            listBuckets: body.listBuckets !== false,
            testBucketName: body.testBucketName || credential.defaultBucket || undefined,
          };

          // Test connection
          const result = await testS3Connection(credential, options);

          // Update credential profile with test results
          const now = new Date();
          await db
            .update(s3Credentials)
            .set({
              lastTestedAt: now,
              lastTestResult: result.data?.success ? 'success' : 'failed',
              lastTestError: result.data?.error || null,
              updatedAt: now,
            })
            .where(eq(s3Credentials.id, id));

          // Return test results
          return Response.json({
            data: result.data,
            processingTime: Date.now() - startTime,
          });
        } catch (error) {
          // Update credential with failure result
          if (id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
            try {
              await db
                .update(s3Credentials)
                .set({
                  lastTestedAt: new Date(),
                  lastTestResult: 'failed',
                  lastTestError: error instanceof Error ? error.message : 'Unknown error',
                  updatedAt: new Date(),
                })
                .where(eq(s3Credentials.id, id));
            } catch (dbError) {
              // Ignore update errors on failure path
              console.error('Failed to update test result:', dbError);
            }
          }

          return createErrorResponse(error);
        }
      },
    },
  },
});
