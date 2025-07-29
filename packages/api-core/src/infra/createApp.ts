import cors from 'cors';
import 'dotenv/config';
import express, { Express } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  return app;
}
