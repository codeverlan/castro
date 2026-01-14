/**
 * IntakeQ Configuration Helper
 * Retrieves IntakeQ API key from database or environment
 */

import { db } from '~/db';
import { intakeqSettings } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { decryptData, encryptData } from '~/services/s3/crypto';

export interface IntakeQConfig {
  apiKey: string;
  defaultPractitionerId?: string | null;
}

/**
 * Get IntakeQ configuration from database or environment
 * Database takes precedence over environment variable
 */
export async function getIntakeQConfig(): Promise<IntakeQConfig | null> {
  try {
    // First try database
    const settings = await db.query.intakeqSettings.findFirst({
      where: eq(intakeqSettings.isActive, true),
    });

    if (settings) {
      try {
        const apiKey = decryptData(JSON.parse(settings.apiKey));
        return {
          apiKey,
          defaultPractitionerId: settings.defaultPractitionerId,
        };
      } catch (error) {
        console.error('Failed to decrypt IntakeQ API key:', error);
        // Fall through to environment variable
      }
    }

    // Fallback to environment variable
    const envApiKey = process.env.INTAKEQ_API_KEY;
    if (envApiKey) {
      return {
        apiKey: envApiKey,
        defaultPractitionerId: null,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting IntakeQ config:', error);

    // Last resort: try environment variable
    const envApiKey = process.env.INTAKEQ_API_KEY;
    if (envApiKey) {
      return {
        apiKey: envApiKey,
        defaultPractitionerId: null,
      };
    }

    return null;
  }
}

/**
 * Check if IntakeQ is configured
 */
export async function isIntakeQConfigured(): Promise<boolean> {
  const config = await getIntakeQConfig();
  return config !== null;
}

/**
 * Save IntakeQ configuration to database
 */
export async function saveIntakeQConfig(config: {
  apiKey: string;
  defaultPractitionerId?: string | null;
}): Promise<void> {
  // Encrypt the API key
  const encryptedApiKey = JSON.stringify(encryptData(config.apiKey));

  // Deactivate all existing settings
  await db
    .update(intakeqSettings)
    .set({ isActive: false, updatedAt: new Date() });

  // Insert new settings
  await db.insert(intakeqSettings).values({
    apiKey: encryptedApiKey,
    defaultPractitionerId: config.defaultPractitionerId || null,
    isActive: true,
  });
}
