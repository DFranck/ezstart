import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express } from 'express';

// Load .env.local first (priority), then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env if vars not set

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  return app;
}
