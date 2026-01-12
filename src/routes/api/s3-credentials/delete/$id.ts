/**
 * DELETE /api/s3-credentials/delete/$id
 * Delete an S3 credential profile
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { s3Credentials } from '~/db/schema';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq } from 'drizzle-orm';

export const Route = createFileRoute('/api/s3-credentials/delete/$id')({
  server: {
    handlers: {
      /**
       * DELETE /api/s3-credentials/delete/$id
       * Delete an S3 credential profile
       */
      DELETE: async ({ params }) => {
        const { id } = params;
        const startTime = Date.now();

        try {
          // Validate ID format
          if (!id || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
            throw new Error('Invalid credential ID format');
          }

          // Check if credential exists
          const existingCredential = await db.query.s3Credentials.findFirst({
            where: eq(s3Credentials.id, id),
          });

          if (!existingCredential) {
            throw new NotFoundError('S3 credential profile not found');
          }

          // Delete the credential profile
          await db.delete(s3Credentials).where(eq(s3Credentials.id, id));

          // Clear credential cache
          const { clearCredentialCache } = await import('~/services/s3/client');
          clearCredentialCache(id);

          return Response.json({
            success: true,
            message: 'S3 credential profile deleted successfully',
            data: {
              id,
              name: existingCredential.name,
            },
            processingTime: Date.now() - startTime,
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
