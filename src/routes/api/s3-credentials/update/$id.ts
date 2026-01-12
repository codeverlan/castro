/**
 * PUT /api/s3-credentials/update/$id
 * Update an existing S3 credential profile
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { s3Credentials } from '~/db/schema';
import {
  updateS3CredentialsSchema,
  s3CredentialsFullSchema,
} from '~/lib/validations/s3Credentials';
import { createErrorResponse, NotFoundError, ConflictError } from '~/lib/api-errors';
import { eq, and } from 'drizzle-orm';
import { redactCredential } from '~/services/s3/crypto';

export const Route = createFileRoute('/api/s3-credentials/update/$id')({
  server: {
    handlers: {
      /**
       * PUT /api/s3-credentials/update/$id
       * Update an S3 credential profile
       */
      PUT: async ({ request, params }) => {
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

          // Parse request body
          const body = await request.json();

          // Validate update data
          const validatedData = updateS3CredentialsSchema.parse({
            ...body,
            id,
          });

          // Import utilities
          const { encryptCredentials, decryptData } = await import('~/services/s3/crypto');

          // Prepare update values
          const updateValues: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          // Handle non-sensitive fields
          if (validatedData.name !== undefined) {
            updateValues.name = validatedData.name;
          }

          if (validatedData.description !== undefined) {
            updateValues.description = validatedData.description;
          }

          if (validatedData.region !== undefined) {
            updateValues.region = validatedData.region;
          }

          if (validatedData.defaultBucket !== undefined) {
            updateValues.defaultBucket = validatedData.defaultBucket;
          }

          if (validatedData.authMethod !== undefined) {
            updateValues.authMethod = validatedData.authMethod;
          }

          if (validatedData.roleArn !== undefined) {
            updateValues.roleArn = validatedData.roleArn;
          }

          if (validatedData.isDefault !== undefined) {
            updateValues.isDefault = validatedData.isDefault;

            // Clear other default flags if setting this as default
            if (validatedData.isDefault) {
              await db
                .update(s3Credentials)
                .set({ isDefault: false, updatedAt: new Date() })
                .where(and(
                  eq(s3Credentials.isDefault, true),
                  eq(s3Credentials.id, id) // Exclude this record
                ));
            }
          }

          // Handle sensitive fields (encrypt if provided)
          if (validatedData.accessKeyId !== undefined) {
            const encrypted = encryptCredentials({
              accessKeyId: validatedData.accessKeyId,
              secretAccessKey: validatedData.secretAccessKey ?? existingCredential.secretAccessKey,
              sessionToken: validatedData.sessionToken,
              roleExternalId: validatedData.roleExternalId,
            });

            updateValues.accessKeyId = encrypted.accessKeyId;
            updateValues.secretAccessKey = encrypted.secretAccessKey;

            if (encrypted.sessionToken !== undefined) {
              updateValues.sessionToken = encrypted.sessionToken;
            }
          }

          if (validatedData.secretAccessKey !== undefined && validatedData.accessKeyId === undefined) {
            // If only secret is being updated, we need the access key too
            throw new Error('Access Key ID must be provided when updating Secret Access Key');
          }

          if (validatedData.sessionToken !== undefined && validatedData.accessKeyId === undefined) {
            // Update session token alone
            const decryptedAccessKey = decryptData(JSON.parse(existingCredential.accessKeyId));
            const decryptedSecretKey = decryptData(JSON.parse(existingCredential.secretAccessKey));

            const encrypted = encryptCredentials({
              accessKeyId: decryptedAccessKey,
              secretAccessKey: decryptedSecretKey,
              sessionToken: validatedData.sessionToken,
              roleExternalId: validatedData.roleExternalId,
            });

            updateValues.accessKeyId = encrypted.accessKeyId;
            updateValues.secretAccessKey = encrypted.secretAccessKey;

            if (encrypted.sessionToken !== undefined) {
              updateValues.sessionToken = encrypted.sessionToken;
            }
          }

          if (validatedData.roleExternalId !== undefined && validatedData.accessKeyId === undefined) {
            // Update role external ID alone
            const decryptedAccessKey = decryptData(JSON.parse(existingCredential.accessKeyId));
            const decryptedSecretKey = decryptData(JSON.parse(existingCredential.secretAccessKey));
            const decryptedSessionToken = existingCredential.sessionToken
              ? decryptData(JSON.parse(existingCredential.sessionToken))
              : undefined;

            const encrypted = encryptCredentials({
              accessKeyId: decryptedAccessKey,
              secretAccessKey: decryptedSecretKey,
              sessionToken: decryptedSessionToken,
              roleExternalId: validatedData.roleExternalId,
            });

            updateValues.accessKeyId = encrypted.accessKeyId;
            updateValues.secretAccessKey = encrypted.secretAccessKey;
            updateValues.sessionToken = encrypted.sessionToken;
            updateValues.roleExternalId = encrypted.roleExternalId;
          }

          // Update the credential profile
          const [updatedCredential] = await db
            .update(s3Credentials)
            .set(updateValues)
            .where(eq(s3Credentials.id, id))
            .returning();

          // Clear credential cache
          const { clearCredentialCache } = await import('~/services/s3/client');
          clearCredentialCache(id);

          // Return sanitized credential (no plaintext secrets)
          const sanitized = {
            ...updatedCredential,
            accessKeyId: '[REDACTED]',
            secretAccessKey: '[REDACTED]',
            sessionToken: updatedCredential.sessionToken ? '[REDACTED]' : null,
            roleExternalId: updatedCredential.roleExternalId ? '[REDACTED]' : null,
          };

          return Response.json({
            data: sanitized,
            processingTime: Date.now() - startTime,
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
