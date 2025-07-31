import { mongoIdSchema } from '../common';
import { z, type Infer } from '../zod-extended';
import { playerSchema } from './player';
import { shopItemSchema } from './shop-item';

export const gameSchema = z.object({
  _id: mongoIdSchema,
  players: z.array(playerSchema).describe('List of players'),
  tick: z.number().describe('Current tick number'),
  map: z.array(z.array(z.string())).describe('2D map representation'),
  shop: z.array(shopItemSchema).describe('Available shop items'),
  phase: z.enum(['waiting', 'playing', 'finished']).describe('Game phase'),
  createdAt: z.string().describe('ISO timestamp'),
  updatedAt: z.string().describe('ISO timestamp'),
});

export type Game = Infer<typeof gameSchema>;
