import { z, type Infer } from '../zod-extended';

export const positionSchema = z.object({
  x: z.number().describe('Position X'),
  y: z.number().describe('Position Y'),
});

export type Position = Infer<typeof positionSchema>;
