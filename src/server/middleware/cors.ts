/**
 * CORS Middleware Configuration
 * Enables cross-origin requests from LMHG-Workspace and other allowed origins
 */

import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: [
    'http://localhost:3000', // Castro dev
    'http://localhost:5173', // LMHG-Workspace dev
    'http://localhost:4173', // LMHG-Workspace preview
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
