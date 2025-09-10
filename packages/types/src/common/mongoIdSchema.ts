import { z } from '../zod-extended';
export const mongoIdSchema = z
  .string({ required_error: 'ID is required' })
  .min(1, 'ID is required')
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
  .describe('MongoDB ObjectId');
