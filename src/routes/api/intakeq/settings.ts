import { createFileRoute } from '@tanstack/react-router';
import { IntakeQApiClient, getIntakeQConfig } from '~/services/intakeq';
import { createErrorResponse } from '~/lib/api-errors';

export const Route = createFileRoute('/api/intakeq/settings')({
  server: {
    handlers: {
      /**
       * GET /api/intakeq/settings
       * Get IntakeQ appointment settings (practitioners, services, locations)
       */
      GET: async () => {
        try {
          // Get API key from database or environment
          const config = await getIntakeQConfig();

          if (!config) {
            return Response.json(
              {
                error: 'IntakeQ API key not configured',
                code: 'INTAKEQ_NOT_CONFIGURED',
                configured: false,
              },
              { status: 200 } // Return 200 so UI can show config prompt
            );
          }

          // Initialize client and fetch settings
          const client = new IntakeQApiClient({ apiKey: config.apiKey });
          const settings = await client.getAppointmentSettings();

          return Response.json({
            data: settings,
            configured: true,
            defaultPractitionerId: config.defaultPractitionerId,
          });
        } catch (error) {
          console.error('IntakeQ API error:', error);
          return createErrorResponse(error);
        }
      },
    },
  },
});
