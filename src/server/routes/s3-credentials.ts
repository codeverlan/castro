/**
 * S3 Credentials API Routes
 * Hono router for S3 credential profile management
 */

import { Hono } from 'hono';
import { db } from '~/db';
import { s3Credentials } from '~/db/schema';
import {
  s3CredentialsQuerySchema,
  s3CredentialsFullSchema,
} from '~/lib/validations/s3Credentials';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { and, eq, desc, sql } from 'drizzle-orm';
import { redactCredential, encryptCredentials } from '~/services/s3/crypto';
import { checkRateLimit, rateLimitConfigs } from '~/lib/rate-limit';
import { logCredentialAccess, logFailedOperation } from '~/lib/audit-logger';
import { testS3Connection } from '~/services/s3';

export const s3CredentialsRouter = new Hono();

/**
 * GET /api/s3-credentials
 * List all S3 credential profiles with optional filtering
 */
s3CredentialsRouter.get('/', async (c) => {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(c.req.raw, rateLimitConfigs.credentials);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const queryParams = {
      authMethod: c.req.query('authMethod') || undefined,
      region: c.req.query('region') || undefined,
      isDefault: c.req.query('isDefault')
        ? c.req.query('isDefault') === 'true'
        : undefined,
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0,
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
      accessKeyId: redactCredential('AKIA...', cred.accessKeyId).replace(
        'AKIA...',
        '[REDACTED]'
      ),
      secretAccessKey: '[REDACTED]',
      sessionToken: cred.sessionToken ? '[REDACTED]' : null,
      roleExternalId: cred.roleExternalId ? '[REDACTED]' : null,
    }));

    // Log successful access
    await logCredentialAccess({
      request: c.req.raw,
      action: 'list',
      credentialType: 's3',
      metadata: {
        count: sanitizedCredentials.length,
        filters: validatedQuery,
      },
    });

    return c.json({
      data: sanitizedCredentials,
      pagination: {
        total,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: validatedQuery.offset + sanitizedCredentials.length < total,
      },
    });
  } catch (error) {
    await logFailedOperation({
      request: c.req.raw,
      action: 'credential_s3_list',
      resourceType: 's3_credentials',
      error: error as Error,
    });
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * POST /api/s3-credentials
 * Create a new S3 credential profile
 */
s3CredentialsRouter.post('/', async (c) => {
  // Rate limiting
  const rateLimitResponse = checkRateLimit(c.req.raw, rateLimitConfigs.credentials);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await c.req.json();

    // Validate request body
    const validatedData = s3CredentialsFullSchema.parse({
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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

    // Log successful creation
    await logCredentialAccess({
      request: c.req.raw,
      action: 'create',
      credentialType: 's3',
      resourceId: newCredential.id,
      metadata: {
        name: newCredential.name,
        authMethod: newCredential.authMethod,
        region: newCredential.region,
      },
    });

    return c.json({ data: sanitized }, 201);
  } catch (error) {
    await logFailedOperation({
      request: c.req.raw,
      action: 'credential_s3_create',
      resourceType: 's3_credentials',
      error: error as Error,
    });
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * PUT /api/s3-credentials/update/:id
 * Update an existing S3 credential profile
 */
s3CredentialsRouter.put('/update/:id', async (c) => {
  const rateLimitResponse = checkRateLimit(c.req.raw, rateLimitConfigs.credentials);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const existingCredential = await db.query.s3Credentials.findFirst({
      where: eq(s3Credentials.id, id),
    });

    if (!existingCredential) {
      throw new NotFoundError(`S3 credential profile with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Update non-sensitive fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.region !== undefined) updateData.region = body.region;
    if (body.defaultBucket !== undefined) updateData.defaultBucket = body.defaultBucket;
    if (body.roleArn !== undefined) updateData.roleArn = body.roleArn;
    if (body.authMethod !== undefined) updateData.authMethod = body.authMethod;

    // Handle default flag
    if (body.isDefault !== undefined) {
      if (body.isDefault) {
        await db
          .update(s3Credentials)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(s3Credentials.isDefault, true));
      }
      updateData.isDefault = body.isDefault;
    }

    // Update sensitive fields if provided
    if (body.accessKeyId || body.secretAccessKey) {
      const encrypted = encryptCredentials({
        accessKeyId: body.accessKeyId || '',
        secretAccessKey: body.secretAccessKey || '',
        sessionToken: body.sessionToken || undefined,
        roleExternalId: body.roleExternalId || undefined,
      });

      if (body.accessKeyId) updateData.accessKeyId = encrypted.accessKeyId;
      if (body.secretAccessKey) updateData.secretAccessKey = encrypted.secretAccessKey;
      if (body.sessionToken !== undefined) updateData.sessionToken = encrypted.sessionToken;
      if (body.roleExternalId !== undefined) updateData.roleExternalId = encrypted.roleExternalId;
    }

    const [updatedCredential] = await db
      .update(s3Credentials)
      .set(updateData)
      .where(eq(s3Credentials.id, id))
      .returning();

    // Return sanitized credential
    const sanitized = {
      ...updatedCredential,
      accessKeyId: '[REDACTED]',
      secretAccessKey: '[REDACTED]',
      sessionToken: updatedCredential.sessionToken ? '[REDACTED]' : null,
      roleExternalId: updatedCredential.roleExternalId ? '[REDACTED]' : null,
    };

    await logCredentialAccess({
      request: c.req.raw,
      action: 'update',
      credentialType: 's3',
      resourceId: id,
    });

    return c.json({ data: sanitized });
  } catch (error) {
    await logFailedOperation({
      request: c.req.raw,
      action: 'credential_s3_update',
      resourceType: 's3_credentials',
      error: error as Error,
    });
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * DELETE /api/s3-credentials/delete/:id
 * Delete an S3 credential profile
 */
s3CredentialsRouter.delete('/delete/:id', async (c) => {
  const rateLimitResponse = checkRateLimit(c.req.raw, rateLimitConfigs.credentials);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = c.req.param();

    const existingCredential = await db.query.s3Credentials.findFirst({
      where: eq(s3Credentials.id, id),
    });

    if (!existingCredential) {
      throw new NotFoundError(`S3 credential profile with ID ${id} not found`);
    }

    await db.delete(s3Credentials).where(eq(s3Credentials.id, id));

    await logCredentialAccess({
      request: c.req.raw,
      action: 'delete',
      credentialType: 's3',
      resourceId: id,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    await logFailedOperation({
      request: c.req.raw,
      action: 'credential_s3_delete',
      resourceType: 's3_credentials',
      error: error as Error,
    });
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * POST /api/s3-credentials/test/:id
 * Test S3 connection for a credential profile
 */
s3CredentialsRouter.post('/test/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const credential = await db.query.s3Credentials.findFirst({
      where: eq(s3Credentials.id, id),
    });

    if (!credential) {
      throw new NotFoundError(`S3 credential profile with ID ${id} not found`);
    }

    const result = await testS3Connection(credential);

    return c.json({
      success: result.success,
      message: result.success
        ? 'S3 connection successful'
        : `S3 connection failed: ${result.error}`,
      data: result.success
        ? {
            bucketCount: result.data?.buckets?.length || 0,
            defaultBucketAccessible: result.data?.defaultBucketAccessible || false,
          }
        : null,
    });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});
