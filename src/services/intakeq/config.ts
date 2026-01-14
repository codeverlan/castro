/**
 * IntakeQ Configuration Helper
 * Retrieves IntakeQ API key from database or environment
 */

import { db } from '~/db';
import { intakeqSettings } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { decryptData } from '~/services/s3/crypto';

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
