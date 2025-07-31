import { z, type Infer } from '../zod-extended';
import { playerSchema } from './player';
import { shopItemSchema } from './shop-item';

export const gameStateSchema = z.object({
  players: z.array(playerSchema).describe('List of players'),
  tick: z.number().describe('Current tick number'),
  map: z.array(z.array(z.string())).describe('2D map representation'),
  shop: z.array(shopItemSchema).describe('Available shop items'),
  phase: z.enum(['waiting', 'playing', 'finished']).describe('Game phase'),
});

export type GameState = Infer<typeof gameStateSchema>;
