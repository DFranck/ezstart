import { generateMock } from '@anatine/zod-mock';
import {
  listingQuerySchema,
  mongoIdSchema,
  z,
  type Infer,
} from '@ezstart/types';
import { GAME_PHASES } from '@tower-defense/config';
import { playerSchema } from './player';
import { shopItemSchema } from './shop-item';

export const gameSchema = z.object({
  _id: mongoIdSchema,
  players: z.array(playerSchema).describe('List of players'),
  tick: z.number().describe('Current tick number'),
  map: z.array(z.array(z.string())).describe('2D map representation'),
  shop: z.array(shopItemSchema).describe('Available shop items'),
  phase: z.enum(GAME_PHASES).describe('Game phase'),
  createdAt: z.string().describe('ISO timestamp'),
  updatedAt: z.string().describe('ISO timestamp'),
});

export const mockGame = generateMock(gameSchema);
export const mockGames = generateMock(z.array(gameSchema));
export const getGamesQuerySchema = listingQuerySchema.extend({
  phase: z
    .enum(GAME_PHASES)
    .optional()
    .describe('Filter by current game phase'),
});

export type Game = Infer<typeof gameSchema>;
export type GetGamesQuery = Infer<typeof getGamesQuerySchema>;
