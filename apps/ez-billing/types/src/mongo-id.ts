import { z } from 'zod';

export const paramsMongoIdSchema = z.object({
  id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('MongoDB ObjectId (24 hex chars)'),
});

export const mongoIdSchema = z.string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
  .describe('MongoDB ObjectId (24 hex chars)');