import { z } from '@ezstart/types';

export const userBaseSchema = z.object({
  username: z.string().min(1).describe('Unique username lowercase'),
});