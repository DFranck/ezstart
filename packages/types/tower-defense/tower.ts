import { generateMock } from '@anatine/zod-mock';
import { mongoIdSchema } from '../common';
import { z, type Infer } from '../zod-extended';
import { positionSchema } from './position';

export const towerSchema = z.object({
  _id: mongoIdSchema,
  name: z.string().describe('Name of the tower'),
  type: z.enum(['archer', 'bomb', 'ice']).describe('Type of tower'),
  position: positionSchema.describe('Tower position on the map'),
  damage: z.number().describe('Damage dealt by the tower'),
  range: z.number().describe('Attack range of the tower'),
});

export type Tower = Infer<typeof towerSchema>;
export const mockTower = generateMock(towerSchema);
export const mockTowers = generateMock(z.array(towerSchema));