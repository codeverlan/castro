/**
 * Rate Limiting Utility
 * Simple in-memory sliding window rate limiter
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60_000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier (IP address, user ID, etc)
   * @param config - Rate limit configuration
   * @returns Object with isAllowed flag and retry info
   */
  check(
    identifier: string,
    config: RateLimitConfig
  ): {
    isAllowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No entry or expired entry - allow and create new
    if (!entry || entry.resetAt < now) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + config.windowMs,
      });

      return {
        isAllowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }

    // Entry exists and not expired
    if (entry.count < config.maxRequests) {
      entry.count++;
      return {
        isAllowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Rate limit exceeded
    return {
      isAllowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000), // seconds
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Get current stats for an identifier
   */
  getStats(identifier: string): RateLimitEntry | null {
    return this.store.get(identifier) || null;
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // Credential endpoints - very restrictive
  credentials: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 requests per 15 minutes
  },
  // IntakeQ config endpoints - restrictive
  intakeqConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 requests per 15 minutes
  },
  // API read operations - moderate
  apiRead: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  // API write operations - moderate
  apiWrite: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
} as const;

/**
 * Extract client identifier from request (IP address)
 */
function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to request URL (not ideal but works for testing)
  return 'anonymous';
}

/**
 * Rate limit middleware wrapper
 * @param config - Rate limit configuration
 * @returns Response if rate limited, null if allowed
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Response | null {
  const identifier = getClientIdentifier(request);
  const result = globalRateLimiter.check(identifier, config);

  // Add rate limit headers
  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };

  if (!result.isAllowed) {
    return Response.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': result.retryAfter!.toString(),
        },
      }
    );
  }

  return null; // Allowed - no response needed
}

/**
 * Reset rate limit for an identifier (useful for testing)
 */
export function resetRateLimit(identifier: string): void {
  globalRateLimiter.reset(identifier);
}

/**
 * Get rate limit stats (useful for debugging)
 */
export function getRateLimitStats(identifier: string): RateLimitEntry | null {
  return globalRateLimiter.getStats(identifier);
}

export { type RateLimitConfig, type RateLimitEntry };
