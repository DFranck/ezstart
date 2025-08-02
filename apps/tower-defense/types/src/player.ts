import { generateMock } from '@anatine/zod-mock';
import { mongoIdSchema, z, type Infer } from '@ezstart/types';
import { mobSchema } from './mob';
import { towerSchema } from './tower';

export const playerSchema = z.object({
  _id: mongoIdSchema,
  name: z.string().describe('Displayed name'),
  gold: z.number().describe('Current gold'),
  income: z.number().describe('Passive income'),
  hp: z.number().describe('Remaining hit points'),
  hand: z.array(towerSchema).describe('Current hand of towers'),
  placedTowers: z.array(towerSchema).describe('Placed towers on the map'),
  incomingUnits: z.array(mobSchema).describe('Units sent by opponents'),
});

export type Player = Infer<typeof playerSchema>;
export const mockPlayer = (): Player => generateMock(playerSchema);
export const mockPlayers = (count = 4): Player[] =>
  Array.from({ length: count }, () => mockPlayer());
