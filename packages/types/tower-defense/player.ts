import { z, type Infer } from '../zod-extended';
import { mobSchema } from './mob';
import { towerSchema } from './tower';

export const playerSchema = z.object({
  id: z.string().describe('Unique ID of the player'),
  name: z.string().describe('Displayed name'),
  gold: z.number().describe('Current gold'),
  income: z.number().describe('Passive income'),
  hp: z.number().describe('Remaining hit points'),
  hand: z.array(towerSchema).describe('Current hand of towers'),
  placedTowers: z.array(towerSchema).describe('Placed towers on the map'),
  incomingUnits: z.array(mobSchema).describe('Units sent by opponents'),
});

export type Player = Infer<typeof playerSchema>;
