/**
 * GET /api/s3-credentials
 * List all S3 credential profiles
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { s3Credentials } from '~/db/schema';
import {
  s3CredentialsQuerySchema,
  s3CredentialsFullSchema,
} from '~/lib/validations/s3Credentials';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import {
  and,
  ne,
  eq,
  desc,
  or,
  isNull,
  sql,
} from 'drizzle-orm';
import { redactCredential } from '~/services/s3/crypto';

export const Route = createFileRoute('/api/s3-credentials/')({
  server: {
    handlers: {
      /**
       * GET /api/s3-credentials
       * List all S3 credential profiles with optional filtering
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const queryParams = {
            authMethod: url.searchParams.get('authMethod') || undefined,
            region: url.searchParams.get('region') || undefined,
            isDefault: url.searchParams.get('isDefault')
              ? url.searchParams.get('isDefault') === 'true'
              : undefined,
            limit: url.searchParams.get('limit')
              ? parseInt(url.searchParams.get('limit')!, 10)
              : 50,
            offset: url.searchParams.get('offset')
              ? parseInt(url.searchParams.get('offset')!, 10)
              : 0,
          };

          // Validate query parameters
          const validatedQuery = s3CredentialsQuerySchema.parse(queryParams);

          // Build where conditions
          const conditions = [];

          if (validatedQuery.authMethod) {
            conditions.push(eq(s3Credentials.authMethod, validatedQuery.authMethod));
          }

          if (validatedQuery.region) {
            conditions.push(eq(s3Credentials.region, validatedQuery.region));
          }

          if (validatedQuery.isDefault !== undefined) {
            conditions.push(eq(s3Credentials.isDefault, validatedQuery.isDefault));
          }

          // Query credential profiles
          const credentials = await db.query.s3Credentials.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            limit: validatedQuery.limit,
            offset: validatedQuery.offset,
            orderBy: [desc(s3Credentials.updatedAt)],
          });

          // Get total count for pagination
          const allCredentials = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(s3Credentials)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

          const total = allCredentials[0]?.count || 0;

          // Sanitize credential data before returning
          const sanitizedCredentials = credentials.map((cred) => ({
            ...cred,
            // Never return plaintext credentials - only redacted info
            accessKeyId: redactCredential('AKIA...', cred.accessKeyId).replace('AKIA...', '[REDACTED]'),
            secretAccessKey: '[REDACTED]',
            sessionToken: cred.sessionToken ? '[REDACTED]' : null,
            roleExternalId: cred.roleExternalId ? '[REDACTED]' : null,
          }));

          return Response.json({
            data: sanitizedCredentials,
            pagination: {
              total,
              limit: validatedQuery.limit,
              offset: validatedQuery.offset,
              hasMore: validatedQuery.offset + sanitizedCredentials.length < total,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * POST /api/s3-credentials
       * Create a new S3 credential profile
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate request body
          const validatedData = s3CredentialsFullSchema.parse({
            ...body,
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Import encryption utilities
          const { encryptCredentials } = await import('~/services/s3/crypto');

          // Encrypt sensitive fields
          const encrypted = encryptCredentials({
            accessKeyId: validatedData.accessKeyId,
            secretAccessKey: validatedData.secretAccessKey,
            sessionToken: validatedData.sessionToken || undefined,
            roleExternalId: validatedData.roleExternalId || undefined,
          });

          // If setting as default, clear other default flags
          if (validatedData.isDefault) {
            await db
              .update(s3Credentials)
              .set({ isDefault: false, updatedAt: new Date() })
              .where(eq(s3Credentials.isDefault, true));
          }

          // Insert the credential profile
          const [newCredential] = await db
            .insert(s3Credentials)
            .values({
              name: validatedData.name,
              description: validatedData.description || null,
              accessKeyId: encrypted.accessKeyId,
              secretAccessKey: encrypted.secretAccessKey,
              region: validatedData.region,
              defaultBucket: validatedData.defaultBucket || null,
              sessionToken: encrypted.sessionToken,
              roleArn: validatedData.roleArn || null,
              roleExternalId: encrypted.roleExternalId,
              authMethod: validatedData.authMethod,
              isDefault: validatedData.isDefault,
            })
            .returning();

          // Return sanitized credential (no plaintext secrets)
          const sanitized = {
            ...newCredential,
            accessKeyId: '[REDACTED]',
            secretAccessKey: '[REDACTED]',
            sessionToken: newCredential.sessionToken ? '[REDACTED]' : null,
            roleExternalId: newCredential.roleExternalId ? '[REDACTED]' : null,
          };

          return Response.json(
            { data: sanitized },
            { status: 201 }
          );
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
