/**
 * Rate Limiting Middleware
 * Protects against abuse of sensitive endpoints
 */

import { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

// Simple in-memory rate limiter (for single-instance deployments)
// For production with multiple instances, use Redis or similar
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (c: Context) => string;  // Custom key generator
  skipInDevMode?: boolean;  // Skip rate limiting in dev mode
}

/**
 * Create rate limiting middleware with custom options
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) => c.req.header('x-forwarded-for') || 'unknown',
    skipInDevMode = true,
  } = options;

  return createMiddleware(async (c: Context, next: Next) => {
    // Skip in dev mode if configured
    if (skipInDevMode && (
      process.env.CASTRO_DEV_MODE === 'true' ||
      process.env.NODE_ENV === 'development' ||
      !process.env.NODE_ENV
    )) {
      await next();
      return;
    }

    const key = `ratelimit:${c.req.path}:${keyGenerator(c)}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // New window
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Existing window
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    if (entry.count > maxRequests) {
      c.header('Retry-After', String(resetSeconds));
      return c.json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again in ${resetSeconds} seconds.`,
          retryAfter: resetSeconds,
        },
      }, 429);
    }

    await next();
  });
}

// Pre-configured rate limiters for common use cases

/**
 * Standard rate limiter - 100 requests per minute
 */
export const standardRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 100,
});

/**
 * Strict rate limiter for sensitive operations - 10 requests per minute
 * Use for: credential operations, config changes, etc.
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10,
});

/**
 * Very strict rate limiter - 5 requests per minute
 * Use for: API key testing, credential creation, etc.
 */
export const veryStrictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 5,
});

/**
 * Bulk operation rate limiter - 20 requests per 5 minutes
 * Use for: batch operations, exports, etc.
 */
export const bulkRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  maxRequests: 20,
});
