import { generateMock } from '@anatine/zod-mock';
import { z, type infer } from 'zod';
import { towerSchema } from './tower.js';

export const towerShopItemSchema = z.object({
  price: z.number(),
  tower: towerSchema,
});

export type TowerShopItem = z.infer<typeof towerShopItemSchema>;
export const mockTowerShopItem = () => generateMock(towerShopItemSchema);
