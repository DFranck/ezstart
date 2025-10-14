import cors from 'cors';
import * as dotenv from 'dotenv';
import express, { Express } from 'express';

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
   * Example: ['https://myapp.vercel.app', 'http://localhost:3000']
   * If not provided, allows all origins (*)
   */
  corsOrigins?: string[];
}

export function createApp(options?: CreateAppOptions): Express {
  const app = express();

  // Configure CORS
  const corsOptions = options?.corsOrigins
    ? {
        origin: options.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
      }
    : {
        origin: '*', // Allow all origins if not specified
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
      };

  app.use(cors(corsOptions));

  // Apply raw body parser for specific routes BEFORE JSON parser
  if (options?.rawBodyRoutes) {
    options.rawBodyRoutes.forEach(route => {
      app.use(route, express.raw({ type: 'application/json' }));
    });
  }

  // JSON parser for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  return app;
}
