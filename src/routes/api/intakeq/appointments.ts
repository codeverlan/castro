import { createFileRoute } from '@tanstack/react-router';
import { IntakeQApiClient, getIntakeQConfig } from '~/services/intakeq';
import { createErrorResponse, ValidationError } from '~/lib/api-errors';

export const Route = createFileRoute('/api/intakeq/appointments')({
  server: {
    handlers: {
      /**
       * GET /api/intakeq/appointments
       * Get appointments from IntakeQ for a specific date or date range
       *
       * Query parameters:
       * - date: string (optional) - Single date in YYYY-MM-DD format (defaults to today)
       * - startDate: string (optional) - Start date for range query
       * - endDate: string (optional) - End date for range query
       * - practitionerId: string (optional) - Filter by practitioner
       */
      GET: async ({ request }) => {
        try {
          // Get API key from database or environment
          const config = await getIntakeQConfig();

          if (!config) {
            return Response.json(
              {
                error: 'IntakeQ API key not configured',
                code: 'INTAKEQ_NOT_CONFIGURED',
                message: 'Please configure IntakeQ in Settings',
              },
              { status: 503 }
            );
          }

          const url = new URL(request.url);
          const dateParam = url.searchParams.get('date');
          const startDateParam = url.searchParams.get('startDate');
          const endDateParam = url.searchParams.get('endDate');
          const practitionerIdParam = url.searchParams.get('practitionerId');

          // Determine date range
          let startDate: string;
          let endDate: string;

          if (startDateParam && endDateParam) {
            startDate = startDateParam;
            endDate = endDateParam;
          } else if (dateParam) {
            startDate = dateParam;
            endDate = dateParam;
          } else {
            // Default to today
            const today = new Date().toISOString().split('T')[0];
            startDate = today;
            endDate = today;
          }

          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
          }

          // Initialize client and fetch appointments
          const client = new IntakeQApiClient({ apiKey: config.apiKey });
          // Use practitioner from query param, or fall back to default from config
          const practitionerId = practitionerIdParam || config.defaultPractitionerId || undefined;
          const schedule = await client.getDaySchedule(startDate, practitionerId);

          return Response.json({
            data: schedule,
            meta: {
              startDate,
              endDate,
              practitionerId: practitionerIdParam,
            },
          });
        } catch (error) {
          console.error('IntakeQ API error:', error);
          return createErrorResponse(error);
        }
      },
    },
  },
});
