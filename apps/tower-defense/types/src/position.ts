import { z, type infer } from 'zod';

export const positionSchema = z.object({
  x: z.number().describe('Position X'),
  y: z.number().describe('Position Y'),
});

export type Position = z.infer<typeof positionSchema>;
