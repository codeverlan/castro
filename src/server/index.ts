/**
 * Castro Standalone API Server
 * Hono-based server for cross-origin API access from LMHG-Workspace
 *
 * Security Features:
 * - Authentication middleware (bypassed in dev mode)
 * - Rate limiting on sensitive endpoints
 * - CORS with allowlist
 * - Request logging and timing
 *
 * Environment Variables:
 * - CASTRO_DEV_MODE: Set to 'true' to bypass authentication (default in development)
 * - CASTRO_API_KEY: Required API key for production mode
 * - CASTRO_API_PORT: Server port (default: 3001)
 */

// Load environment variables FIRST - before any other imports
import 'dotenv/config';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';
import {
  corsMiddleware,
  authMiddleware,
  standardRateLimiter,
  strictRateLimiter,
} from './middleware';
import { sessionsRouter } from './routes/sessions';
import { templatesRouter } from './routes/templates';
import { recordingsRouter } from './routes/recordings';
import { gapsRouter } from './routes/gaps';
import { notesRouter } from './routes/notes';
import { promptsRouter } from './routes/prompts';
import { intakeqRouter } from './routes/intakeq';
import { s3CredentialsRouter } from './routes/s3-credentials';
import { auditLogsRouter } from './routes/audit-logs';
import { appSettingsRouter } from './routes/app-settings';

// Verify database connection on startup
import { checkConnection } from '~/db';

const app = new Hono();

// =============================================================================
// Global Middleware (applied to all routes)
// =============================================================================

// Logging and timing
app.use('*', logger());
app.use('*', timing());

// Security headers
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

// CORS - must come before auth to handle preflight
app.use('*', corsMiddleware);

// =============================================================================
// Public Endpoints (no authentication required)
// =============================================================================

// Health check - always public for load balancer/monitoring
app.get('/health', (c) => {
  const isDevMode = process.env.CASTRO_DEV_MODE === 'true' ||
                    process.env.NODE_ENV === 'development' ||
                    !process.env.NODE_ENV;

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.1',
    mode: isDevMode ? 'development' : 'production',
    auth: isDevMode ? 'bypassed' : 'required',
  });
});

// =============================================================================
// Protected API Routes
// =============================================================================

// Apply authentication to all /api/* routes
app.use('/api/*', authMiddleware);

// Apply standard rate limiting to all API routes
app.use('/api/*', standardRateLimiter);

// Apply stricter rate limiting to sensitive credential/config endpoints
app.use('/api/s3-credentials/*', strictRateLimiter);
app.use('/api/intakeq/config', strictRateLimiter);
app.use('/api/intakeq/test', strictRateLimiter);

// Mount API routes
app.route('/api/sessions', sessionsRouter);
app.route('/api/templates', templatesRouter);
app.route('/api/recordings', recordingsRouter);
app.route('/api/gaps', gapsRouter);
app.route('/api/notes', notesRouter);
app.route('/api/prompts', promptsRouter);
app.route('/api/intakeq', intakeqRouter);
app.route('/api/s3-credentials', s3CredentialsRouter);
app.route('/api/audit-logs', auditLogsRouter);
app.route('/api/app-settings', appSettingsRouter);

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  const isDevMode = process.env.CASTRO_DEV_MODE === 'true' ||
                    process.env.NODE_ENV === 'development' ||
                    !process.env.NODE_ENV;

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: isDevMode ? err.message : 'An unexpected error occurred',
        ...(isDevMode && { stack: err.stack }),
      },
    },
    500
  );
});

// =============================================================================
// Server Startup
// =============================================================================

const port = parseInt(process.env.CASTRO_API_PORT || '3001', 10);

async function startServer() {
  const isDevMode = process.env.CASTRO_DEV_MODE === 'true' ||
                    process.env.NODE_ENV === 'development' ||
                    !process.env.NODE_ENV;

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           🏥 Castro API Server                            ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Port:     ${port}                                          ║`);
  console.log(`║  Mode:     ${isDevMode ? 'DEVELOPMENT (auth bypassed)' : 'PRODUCTION (auth required)'}        ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // Verify database connection
  const dbConnected = await checkConnection();
  if (dbConnected) {
    console.log('✅ Database connection verified');
  } else {
    console.error('❌ Database connection failed - check DATABASE_* env vars');
    console.log('   DATABASE_HOST:', process.env.DATABASE_HOST);
    console.log('   DATABASE_PORT:', process.env.DATABASE_PORT);
    console.log('   DATABASE_NAME:', process.env.DATABASE_NAME);
  }

  if (isDevMode) {
    console.log('');
    console.log('⚠️  DEVELOPMENT MODE: Authentication is bypassed');
    console.log('   For production, set:');
    console.log('   - CASTRO_DEV_MODE=false');
    console.log('   - CASTRO_API_KEY=<your-secret-key>');
    console.log('');
  }

  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`📍 API base:     http://localhost:${port}/api`);
  console.log('');

  serve({
    fetch: app.fetch,
    port,
  });
}

startServer();

export default app;
