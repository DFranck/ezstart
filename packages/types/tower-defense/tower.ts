import { z, type Infer } from '../zod-extended';
import { positionSchema } from './position';

export const towerSchema = z.object({
  id: z.string().describe('Unique ID of the tower'),
  type: z.enum(['archer', 'bomb', 'ice']).describe('Type of tower'),
  position: positionSchema.describe('Tower position on the map'),
  damage: z.number().describe('Damage dealt by the tower'),
  range: z.number().describe('Attack range of the tower'),
});

export type Tower = Infer<typeof towerSchema>;
