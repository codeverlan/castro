/**
 * IntakeQ Configuration API
 * Manages IntakeQ API key storage and retrieval
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { intakeqSettings } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { encryptData, decryptData } from '~/services/s3/crypto';
import { IntakeQApiClient } from '~/services/intakeq';
import { createErrorResponse } from '~/lib/api-errors';
import { checkRateLimit, rateLimitConfigs } from '~/lib/rate-limit';
import { logCredentialAccess, logFailedOperation } from '~/lib/audit-logger';

export const Route = createFileRoute('/api/intakeq/config')({
  server: {
    handlers: {
      /**
       * GET /api/intakeq/config
       * Check if IntakeQ is configured and get settings (without exposing API key)
       */
      GET: async ({ request }) => {
        // Rate limiting
        const rateLimitResponse = checkRateLimit(request, rateLimitConfigs.intakeqConfig);
        if (rateLimitResponse) return rateLimitResponse;

        try {
          const settings = await db.query.intakeqSettings.findFirst({
            where: eq(intakeqSettings.isActive, true),
          });

          if (!settings) {
            // Log access attempt for unconfigured IntakeQ
            await logCredentialAccess({
              request,
              action: 'read',
              credentialType: 'intakeq',
              metadata: { configured: false },
            });

            return Response.json({
              configured: false,
              data: null,
            });
          }

          // Log successful read
          await logCredentialAccess({
            request,
            action: 'read',
            credentialType: 'intakeq',
            resourceId: settings.id,
            metadata: { configured: true },
          });

          return Response.json({
            configured: true,
            data: {
              id: settings.id,
              defaultPractitionerId: settings.defaultPractitionerId,
              lastTestedAt: settings.lastTestedAt,
              lastTestResult: settings.lastTestResult,
              createdAt: settings.createdAt,
              updatedAt: settings.updatedAt,
              // Never expose the API key
              hasApiKey: true,
            },
          });
        } catch (error) {
          console.error('Error fetching IntakeQ config:', error);
          // Log failed operation
          await logFailedOperation({
            request,
            action: 'config_intakeq_read',
            resourceType: 'intakeq_settings',
            error: error as Error,
          });
          return createErrorResponse(error);
        }
      },

      /**
       * POST /api/intakeq/config
       * Save IntakeQ API key configuration
       */
      POST: async ({ request }) => {
        // Rate limiting
        const rateLimitResponse = checkRateLimit(request, rateLimitConfigs.intakeqConfig);
        if (rateLimitResponse) return rateLimitResponse;

        try {
          const body = await request.json();
          const { apiKey, defaultPractitionerId } = body;

          if (!apiKey || typeof apiKey !== 'string') {
            return Response.json(
              { error: 'API key is required' },
              { status: 400 }
            );
          }

          // Encrypt the API key
          const encryptedApiKey = JSON.stringify(encryptData(apiKey));

          // Check if settings already exist
          const existing = await db.query.intakeqSettings.findFirst({
            where: eq(intakeqSettings.isActive, true),
          });

          if (existing) {
            // Update existing settings
            await db
              .update(intakeqSettings)
              .set({
                apiKey: encryptedApiKey,
                defaultPractitionerId: defaultPractitionerId || null,
                updatedAt: new Date(),
                // Clear previous test results
                lastTestedAt: null,
                lastTestResult: null,
                lastTestError: null,
              })
              .where(eq(intakeqSettings.id, existing.id));

            // Log successful update
            await logCredentialAccess({
              request,
              action: 'update',
              credentialType: 'intakeq',
              resourceId: existing.id,
              metadata: {
                defaultPractitionerId: defaultPractitionerId || null,
              },
            });

            return Response.json({
              success: true,
              message: 'IntakeQ configuration updated',
            });
          }

          // Create new settings
          const [newSettings] = await db
            .insert(intakeqSettings)
            .values({
              apiKey: encryptedApiKey,
              defaultPractitionerId: defaultPractitionerId || null,
              isActive: true,
            })
            .returning();

          // Log successful creation
          await logCredentialAccess({
            request,
            action: 'create',
            credentialType: 'intakeq',
            resourceId: newSettings.id,
            metadata: {
              defaultPractitionerId: defaultPractitionerId || null,
            },
          });

          return Response.json({
            success: true,
            message: 'IntakeQ configuration saved',
          });
        } catch (error) {
          console.error('Error saving IntakeQ config:', error);
          // Log failed operation
          await logFailedOperation({
            request,
            action: 'config_intakeq_create',
            resourceType: 'intakeq_settings',
            error: error as Error,
          });
          return createErrorResponse(error);
        }
      },

      /**
       * DELETE /api/intakeq/config
       * Remove IntakeQ configuration
       */
      DELETE: async ({ request }) => {
        // Rate limiting
        const rateLimitResponse = checkRateLimit(request, rateLimitConfigs.intakeqConfig);
        if (rateLimitResponse) return rateLimitResponse;

        try {
          // Get the settings being deleted for logging
          const settings = await db.query.intakeqSettings.findFirst({
            where: eq(intakeqSettings.isActive, true),
          });

          await db
            .update(intakeqSettings)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(intakeqSettings.isActive, true));

          // Log successful deletion
          await logCredentialAccess({
            request,
            action: 'delete',
            credentialType: 'intakeq',
            resourceId: settings?.id,
          });

          return Response.json({
            success: true,
            message: 'IntakeQ configuration removed',
          });
        } catch (error) {
          console.error('Error removing IntakeQ config:', error);
          // Log failed operation
          await logFailedOperation({
            request,
            action: 'config_intakeq_delete',
            resourceType: 'intakeq_settings',
            error: error as Error,
          });
          return createErrorResponse(error);
        }
      },
    },
  },
});
