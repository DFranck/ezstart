import { z } from '../zod-extended';

export const paramsMongoIdSchema = z.object({
  id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('MongoDB ObjectId (24 hex chars)')
    .openapi({ example: '64abcda2d57c3adc668f1b2' }),
});
