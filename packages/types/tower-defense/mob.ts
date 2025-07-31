import { mongoIdSchema } from '../common';
import { z, type Infer } from '../zod-extended';

export const mobSchema = z.object({
  _id: mongoIdSchema,
  name: z.string().describe('Name of the mob'),
  type: z.enum(['goblin', 'wolf', 'boss']).describe('Type of mob'),
  hp: z.number().describe('Health points of the mob'),
  speed: z.number().describe('Speed of movement'),
  effects: z.array(z.string()).optional().describe('Status effects applied'),
});

export type Mob = Infer<typeof mobSchema>;
