/**
 * IntakeQ Connection Test API
 * Tests the IntakeQ API connection with stored credentials
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { intakeqSettings } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { decryptData } from '~/services/s3/crypto';
import { IntakeQApiClient } from '~/services/intakeq';
import { createErrorResponse } from '~/lib/api-errors';
import { checkRateLimit, rateLimitConfigs } from '~/lib/rate-limit';
import { logAuditEvent, logFailedOperation } from '~/lib/audit-logger';

export const Route = createFileRoute('/api/intakeq/test')({
  server: {
    handlers: {
      /**
       * POST /api/intakeq/test
       * Test IntakeQ API connection
       */
      POST: async ({ request }) => {
        // Rate limiting
        const rateLimitResponse = checkRateLimit(request, rateLimitConfigs.intakeqConfig);
        if (rateLimitResponse) return rateLimitResponse;

        try {
          // Get active settings
          const settings = await db.query.intakeqSettings.findFirst({
            where: eq(intakeqSettings.isActive, true),
          });

          if (!settings) {
            return Response.json(
              {
                success: false,
                error: 'IntakeQ is not configured',
                code: 'NOT_CONFIGURED',
              },
              { status: 400 }
            );
          }

          // Decrypt API key
          let apiKey: string;
          try {
            apiKey = decryptData(JSON.parse(settings.apiKey));
          } catch (error) {
            return Response.json(
              {
                success: false,
                error: 'Failed to decrypt API key',
                code: 'DECRYPTION_FAILED',
              },
              { status: 500 }
            );
          }

          // Test the connection by fetching settings
          const client = new IntakeQApiClient({ apiKey });

          try {
            const appointmentSettings = await client.getAppointmentSettings();

            // Update test results in database
            await db
              .update(intakeqSettings)
              .set({
                lastTestedAt: new Date(),
                lastTestResult: 'success',
                lastTestError: null,
                updatedAt: new Date(),
              })
              .where(eq(intakeqSettings.id, settings.id));

            // Log successful test
            await logAuditEvent({
              request,
              action: 'config_intakeq_test',
              resourceType: 'intakeq_settings',
              resourceId: settings.id,
              description: 'IntakeQ connection test successful',
              severity: 'info',
              metadata: {
                practitioners: appointmentSettings.Practitioners?.length || 0,
                services: appointmentSettings.Services?.length || 0,
                locations: appointmentSettings.Locations?.length || 0,
              },
            });

            return Response.json({
              success: true,
              message: 'IntakeQ connection successful',
              data: {
                practitioners: appointmentSettings.Practitioners?.length || 0,
                services: appointmentSettings.Services?.length || 0,
                locations: appointmentSettings.Locations?.length || 0,
              },
            });
          } catch (apiError) {
            const errorMessage =
              apiError instanceof Error ? apiError.message : 'Unknown error';

            // Update test results in database
            await db
              .update(intakeqSettings)
              .set({
                lastTestedAt: new Date(),
                lastTestResult: 'failed',
                lastTestError: errorMessage,
                updatedAt: new Date(),
              })
              .where(eq(intakeqSettings.id, settings.id));

            // Log failed test
            await logAuditEvent({
              request,
              action: 'config_intakeq_test',
              resourceType: 'intakeq_settings',
              resourceId: settings.id,
              description: `IntakeQ connection test failed: ${errorMessage}`,
              severity: 'warning',
              metadata: {
                error: errorMessage,
              },
            });

            return Response.json({
              success: false,
              error: errorMessage,
              code: 'API_ERROR',
            });
          }
        } catch (error) {
          console.error('Error testing IntakeQ connection:', error);
          return createErrorResponse(error);
        }
      },
    },
  },
});
