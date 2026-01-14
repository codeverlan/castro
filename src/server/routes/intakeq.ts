/**
 * IntakeQ API Routes
 * Hono router for IntakeQ integration
 */

import { Hono } from 'hono';
import { IntakeQApiClient, getIntakeQConfig, saveIntakeQConfig } from '~/services/intakeq';
import { createErrorResponse } from '~/lib/api-errors';

export const intakeqRouter = new Hono();

/**
 * GET /api/intakeq/settings
 * Get IntakeQ appointment settings (practitioners, services, locations)
 */
intakeqRouter.get('/settings', async (c) => {
  try {
    // Get API key from database or environment
    const config = await getIntakeQConfig();

    if (!config) {
      return c.json(
        {
          error: 'IntakeQ API key not configured',
          code: 'INTAKEQ_NOT_CONFIGURED',
          configured: false,
        },
        200 // Return 200 so UI can show config prompt
      );
    }

    // Initialize client and fetch settings
    const client = new IntakeQApiClient({ apiKey: config.apiKey });
    const settings = await client.getAppointmentSettings();

    return c.json({
      data: settings,
      configured: true,
      defaultPractitionerId: config.defaultPractitionerId,
    });
  } catch (error) {
    console.error('IntakeQ API error:', error);
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/intakeq/appointments
 * Get appointments from IntakeQ
 */
intakeqRouter.get('/appointments', async (c) => {
  try {
    const config = await getIntakeQConfig();

    if (!config) {
      return c.json(
        {
          error: 'IntakeQ API key not configured',
          code: 'INTAKEQ_NOT_CONFIGURED',
        },
        400
      );
    }

    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const practitionerId = c.req.query('practitionerId');
    const status = c.req.query('status');

    const client = new IntakeQApiClient({ apiKey: config.apiKey });
    const appointments = await client.getAppointments({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      practitionerId: practitionerId || config.defaultPractitionerId || undefined,
      status: status as 'scheduled' | 'cancelled' | 'completed' | undefined,
    });

    return c.json({ data: appointments });
  } catch (error) {
    console.error('IntakeQ appointments error:', error);
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/intakeq/config
 * Get IntakeQ configuration status
 */
intakeqRouter.get('/config', async (c) => {
  try {
    const config = await getIntakeQConfig();

    return c.json({
      configured: !!config,
      defaultPractitionerId: config?.defaultPractitionerId || null,
      hasApiKey: !!config?.apiKey,
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
 * POST /api/intakeq/config
 * Save IntakeQ configuration
 */
intakeqRouter.post('/config', async (c) => {
  try {
    const body = await c.req.json();

    const { apiKey, defaultPractitionerId } = body;

    if (!apiKey) {
      return c.json({ error: 'apiKey is required' }, 400);
    }

    // Test the API key before saving
    const client = new IntakeQApiClient({ apiKey });
    try {
      await client.getAppointmentSettings();
    } catch {
      return c.json(
        {
          error: 'Invalid API key - could not connect to IntakeQ',
          code: 'INVALID_API_KEY',
        },
        400
      );
    }

    // Save the configuration
    await saveIntakeQConfig({
      apiKey,
      defaultPractitionerId: defaultPractitionerId || null,
    });

    return c.json({
      success: true,
      message: 'IntakeQ configuration saved successfully',
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
 * POST /api/intakeq/test
 * Test IntakeQ API connection
 */
intakeqRouter.post('/test', async (c) => {
  try {
    const body = await c.req.json();

    let apiKey = body.apiKey;

    // If no API key provided, use saved config
    if (!apiKey) {
      const config = await getIntakeQConfig();
      if (!config) {
        return c.json(
          {
            success: false,
            error: 'No API key provided and no saved configuration found',
          },
          400
        );
      }
      apiKey = config.apiKey;
    }

    const client = new IntakeQApiClient({ apiKey });

    try {
      const settings = await client.getAppointmentSettings();

      return c.json({
        success: true,
        message: 'IntakeQ connection successful',
        data: {
          practitionerCount: settings.practitioners?.length || 0,
          serviceCount: settings.services?.length || 0,
          locationCount: settings.locations?.length || 0,
        },
      });
    } catch (error) {
      return c.json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to connect to IntakeQ',
      });
    }
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/intakeq/note-types
 * Get available note types from IntakeQ
 */
intakeqRouter.get('/note-types', async (c) => {
  try {
    const config = await getIntakeQConfig();

    if (!config) {
      return c.json(
        {
          error: 'IntakeQ API key not configured',
          code: 'INTAKEQ_NOT_CONFIGURED',
        },
        400
      );
    }

    const client = new IntakeQApiClient({ apiKey: config.apiKey });
    const noteTypes = await client.getNoteTypes();

    return c.json({ data: noteTypes });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/intakeq/note-types/:id
 * Get a specific note type by ID
 */
intakeqRouter.get('/note-types/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const config = await getIntakeQConfig();

    if (!config) {
      return c.json(
        {
          error: 'IntakeQ API key not configured',
          code: 'INTAKEQ_NOT_CONFIGURED',
        },
        400
      );
    }

    const client = new IntakeQApiClient({ apiKey: config.apiKey });
    const noteType = await client.getNoteTypeById(id);

    if (!noteType) {
      return c.json({ error: `Note type with ID ${id} not found` }, 404);
    }

    return c.json({ data: noteType });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});
