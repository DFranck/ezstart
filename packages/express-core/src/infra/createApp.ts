import cors from 'cors';
import * as dotenv from 'dotenv';
import express, { Express } from 'express';
import type { AppName } from '@ezstart/config/urls';
import { createCorsConfig, getAllowedOrigins } from '@ezstart/config/cors';
import { securityHeaders, securityHeadersPresets } from '../middleware/security-headers.js';

// Load .env.local first (priority), then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env if vars not set

export interface CreateAppOptions {
  /**
   * Routes that need raw body (e.g., for webhook signature verification)
   * Example: ['/api/webhooks/stripe', '/api/webhooks/paypal']
   */
  rawBodyRoutes?: string[];
  /**
   * CORS origins to allow
   *
   * Option 1 (RECOMMENDED): Auto-detect using @ezstart/config
   * ```typescript
   * createApp({ apiApp: 'ezauth' }) // Auto CORS for all apps calling EZAuth
   * ```
   *
   * Option 2 (MANUAL): Provide custom origins
   * ```typescript
   * createApp({ corsOrigins: ['https://myapp.vercel.app'] })
   * ```
   *
   * Option 3 (LEGACY): Not provided = allows all origins (*)
   */
  apiApp?: AppName;
  corsOrigins?: string[];
}

export function createApp(options?: CreateAppOptions): Express {
  const app = express();

  // Trust proxy - Required when behind reverse proxy (Railway, Vercel, Oracle nginx)
  // Allows Express to read X-Forwarded-* headers for real client IP
  // Critical for rate limiting to work correctly
  app.set('trust proxy', true);

  // Configure CORS
  let corsOptions: any;

  if (options?.apiApp) {
    // Option 1: Auto-detect CORS using @ezstart/config (RECOMMENDED)
    corsOptions = createCorsConfig(options.apiApp);

    // Get allowed origins for logging
    const allowedOrigins = getAllowedOrigins(options.apiApp);

    console.log(`✅ [CORS] Auto-configured for ${options.apiApp}: ${allowedOrigins.length} origins allowed`);
    console.log(`   📋 Allowed origins:`);
    allowedOrigins.forEach(origin => console.log(`      - ${origin}`));
  } else if (options?.corsOrigins) {
    // Option 2: Manual CORS origins
    corsOptions = {
      origin: options.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    };

    console.log(`✅ [CORS] Manually configured: ${options.corsOrigins.length} origins allowed`);
  } else {
    // Option 3: Allow all (LEGACY)
    corsOptions = {
      origin: '*',
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    };
    console.warn(`⚠️ [CORS] Allowing ALL origins (*) - Consider using apiApp option`);
  }

  app.use(cors(corsOptions));

  // Security Headers - Add comprehensive security headers to all responses
  // Automatically detects environment (NODE_ENV) and applies appropriate preset
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isProduction) {
    app.use(securityHeaders(securityHeadersPresets.moderate()));
    console.log('🔒 [Security] Production security headers enabled');
  } else if (isDevelopment) {
    app.use(securityHeaders(securityHeadersPresets.development()));
    console.log('🔓 [Security] Development mode - relaxed headers');
  } else {
    // Default to moderate for other environments (test, staging, etc.)
    app.use(securityHeaders(securityHeadersPresets.moderate()));
    console.log('🔒 [Security] Moderate security headers enabled');
  }

  // Apply raw body parser for specific routes BEFORE JSON parser
  if (options?.rawBodyRoutes) {
    options.rawBodyRoutes.forEach(route => {
      app.use(route, express.raw({ type: 'application/json' }));
    });
  }

  // JSON parser for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ✅ Health check endpoints (automatically added to all APIs)
  const serviceName = options?.apiApp || 'API';

  // Simple health check for Railway/Render (no monitoring, no fetch)
  // Used by: Railway Healthcheck Path
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  });

  // Root endpoint (same as /health for convenience)
  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}
