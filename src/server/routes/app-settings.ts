/**
 * Application Settings API Routes
 * Hono router for environment/app configuration management
 */

import { Hono } from 'hono';
import { db } from '~/db';
import { appSettings, DEFAULT_APP_SETTINGS } from '~/db/schema';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const appSettingsRouter = new Hono();

// Validation schema for updating a setting
const updateSettingSchema = z.object({
  value: z.any(),
});

// Validation schema for bulk update
const bulkUpdateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string(),
      value: z.any(),
    })
  ),
});

/**
 * GET /api/app-settings
 * List all application settings grouped by category
 */
appSettingsRouter.get('/', async (c) => {
  try {
    // Get all settings
    let settings = await db.query.appSettings.findMany({
      orderBy: (appSettings, { asc }) => [asc(appSettings.category), asc(appSettings.sortOrder)],
    });

    // If no settings exist, seed with defaults
    if (settings.length === 0) {
      await seedDefaultSettings();
      settings = await db.query.appSettings.findMany({
        orderBy: (appSettings, { asc }) => [asc(appSettings.category), asc(appSettings.sortOrder)],
      });
    }

    // Group by category
    const grouped = settings.reduce(
      (acc, setting) => {
        const category = setting.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        // Mask password values
        const displayValue =
          setting.valueType === 'password' && setting.value
            ? '••••••••'
            : setting.value;

        acc[category].push({
          ...setting,
          displayValue,
        });
        return acc;
      },
      {} as Record<string, (typeof settings)[number][]>
    );

    return c.json({
      data: settings,
      grouped,
      categories: Object.keys(grouped),
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
 * GET /api/app-settings/:key
 * Get a specific setting by key
 */
appSettingsRouter.get('/:key', async (c) => {
  try {
    const { key } = c.req.param();

    const setting = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, key),
    });

    if (!setting) {
      throw new NotFoundError(`Setting with key '${key}' not found`);
    }

    // Mask password value
    const displayValue =
      setting.valueType === 'password' && setting.value
        ? '••••••••'
        : setting.value;

    return c.json({
      data: {
        ...setting,
        displayValue,
      },
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
 * PUT /api/app-settings/:key
 * Update a specific setting
 */
appSettingsRouter.put('/:key', async (c) => {
  try {
    const { key } = c.req.param();
    const body = await c.req.json();

    const existingSetting = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, key),
    });

    if (!existingSetting) {
      throw new NotFoundError(`Setting with key '${key}' not found`);
    }

    // Validate request body
    const validatedData = updateSettingSchema.parse(body);

    // Update the setting
    const [updatedSetting] = await db
      .update(appSettings)
      .set({
        value: validatedData.value,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.key, key))
      .returning();

    // Mask password value in response
    const displayValue =
      updatedSetting.valueType === 'password' && updatedSetting.value
        ? '••••••••'
        : updatedSetting.value;

    return c.json({
      data: {
        ...updatedSetting,
        displayValue,
      },
      requiresRestart: updatedSetting.requiresRestart,
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
 * PUT /api/app-settings
 * Bulk update multiple settings
 */
appSettingsRouter.put('/', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = bulkUpdateSchema.parse(body);

    const results = [];
    let requiresRestart = false;

    for (const { key, value } of validatedData.settings) {
      const existingSetting = await db.query.appSettings.findFirst({
        where: eq(appSettings.key, key),
      });

      if (!existingSetting) {
        continue; // Skip unknown settings
      }

      const [updated] = await db
        .update(appSettings)
        .set({
          value,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.key, key))
        .returning();

      if (updated.requiresRestart) {
        requiresRestart = true;
      }

      results.push(updated);
    }

    return c.json({
      data: results,
      updated: results.length,
      requiresRestart,
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
 * POST /api/app-settings/reset/:key
 * Reset a specific setting to its default value
 */
appSettingsRouter.post('/reset/:key', async (c) => {
  try {
    const { key } = c.req.param();

    const existingSetting = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, key),
    });

    if (!existingSetting) {
      throw new NotFoundError(`Setting with key '${key}' not found`);
    }

    if (existingSetting.defaultValue === null) {
      throw new Error(`Setting '${key}' has no default value`);
    }

    // Reset to default
    const [updatedSetting] = await db
      .update(appSettings)
      .set({
        value: existingSetting.defaultValue,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.key, key))
      .returning();

    return c.json({
      data: updatedSetting,
      requiresRestart: updatedSetting.requiresRestart,
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
 * POST /api/app-settings/reset-all
 * Reset all settings to defaults
 */
appSettingsRouter.post('/reset-all', async (c) => {
  try {
    const allSettings = await db.query.appSettings.findMany();

    let requiresRestart = false;

    for (const setting of allSettings) {
      if (setting.defaultValue !== null) {
        const [updated] = await db
          .update(appSettings)
          .set({
            value: setting.defaultValue,
            updatedAt: new Date(),
          })
          .where(eq(appSettings.key, setting.key))
          .returning();

        if (updated.requiresRestart) {
          requiresRestart = true;
        }
      }
    }

    return c.json({
      success: true,
      requiresRestart,
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
 * POST /api/app-settings/seed
 * Seed default settings (useful for initial setup or after db reset)
 */
appSettingsRouter.post('/seed', async (c) => {
  try {
    await seedDefaultSettings();

    const settings = await db.query.appSettings.findMany({
      orderBy: (appSettings, { asc }) => [asc(appSettings.category), asc(appSettings.sortOrder)],
    });

    return c.json({
      success: true,
      count: settings.length,
      data: settings,
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
 * Helper function to seed default settings
 */
async function seedDefaultSettings() {
  for (const setting of DEFAULT_APP_SETTINGS) {
    // Check if setting already exists
    const existing = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, setting.key),
    });

    if (!existing) {
      await db.insert(appSettings).values(setting);
    }
  }
}
