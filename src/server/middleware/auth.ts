/**
 * Authentication Middleware
 * Provides API security with development bypass option
 *
 * Environment Variables:
 * - CASTRO_DEV_MODE: Set to 'true' to bypass authentication (development only)
 * - CASTRO_API_KEY: Required API key for production mode
 * - CASTRO_API_KEYS: Comma-separated list of valid API keys (optional, for multiple clients)
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

// Check if running in development mode
const isDevMode = (): boolean => {
  return process.env.CASTRO_DEV_MODE === 'true' ||
         process.env.NODE_ENV === 'development' ||
         !process.env.NODE_ENV;
};

// Get valid API keys from environment
const getValidApiKeys = (): Set<string> => {
  const keys = new Set<string>();

  // Single API key
  if (process.env.CASTRO_API_KEY) {
    keys.add(process.env.CASTRO_API_KEY);
  }

  // Multiple API keys (comma-separated)
  if (process.env.CASTRO_API_KEYS) {
    process.env.CASTRO_API_KEYS.split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .forEach(k => keys.add(k));
  }

  return keys;
};

// Extract API key from request
const extractApiKey = (c: Context): string | null => {
  // Check Authorization header (Bearer token or API key)
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    if (authHeader.startsWith('ApiKey ')) {
      return authHeader.slice(7);
    }
    // Plain API key in Authorization header
    return authHeader;
  }

  // Check X-API-Key header
  const apiKeyHeader = c.req.header('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter (least secure, use only for development)
  if (isDevMode()) {
    const queryKey = c.req.query('api_key');
    if (queryKey) {
      return queryKey;
    }
  }

  return null;
};

/**
 * Authentication middleware
 * In dev mode: Allows all requests, logs a warning
 * In production: Requires valid API key
 */
export const authMiddleware = createMiddleware(async (c: Context, next: Next) => {
  // Development mode bypass
  if (isDevMode()) {
    // Add dev mode indicator to context
    c.set('authMode', 'development');
    c.set('authenticated', true);

    // Log warning on first request (not every request)
    if (!globalThis.__castroDevModeWarningLogged) {
      console.warn('⚠️  CASTRO API: Running in DEVELOPMENT MODE - authentication bypassed');
      console.warn('   Set CASTRO_DEV_MODE=false and CASTRO_API_KEY for production');
      globalThis.__castroDevModeWarningLogged = true;
    }

    await next();
    return;
  }

  // Production mode - require authentication
  const apiKey = extractApiKey(c);

  if (!apiKey) {
    return c.json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'API key required. Provide via Authorization header or X-API-Key header.',
      },
    }, 401);
  }

  const validKeys = getValidApiKeys();

  if (validKeys.size === 0) {
    console.error('❌ CASTRO API: No API keys configured. Set CASTRO_API_KEY environment variable.');
    return c.json({
      error: {
        code: 'SERVER_CONFIGURATION_ERROR',
        message: 'Server not properly configured for authentication.',
      },
    }, 500);
  }

  if (!validKeys.has(apiKey)) {
    return c.json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided.',
      },
    }, 401);
  }

  // Valid API key - allow request
  c.set('authMode', 'api_key');
  c.set('authenticated', true);
  c.set('apiKeyUsed', apiKey.slice(0, 8) + '...');  // Log partial key for debugging

  await next();
});

/**
 * Optional auth middleware - allows unauthenticated requests but marks them
 * Useful for endpoints that have different behavior for authenticated vs anonymous
 */
export const optionalAuthMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const apiKey = extractApiKey(c);
  const validKeys = getValidApiKeys();

  if (apiKey && validKeys.has(apiKey)) {
    c.set('authenticated', true);
    c.set('authMode', 'api_key');
  } else {
    c.set('authenticated', false);
    c.set('authMode', 'anonymous');
  }

  await next();
});

// Extend global namespace for dev mode warning flag
declare global {
  var __castroDevModeWarningLogged: boolean | undefined;
}
