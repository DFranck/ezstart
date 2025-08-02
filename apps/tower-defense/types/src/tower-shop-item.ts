import { generateMock } from '@anatine/zod-mock';
import { z, type Infer } from '@ezstart/types';
import { towerSchema } from './tower';

export const towerShopItemSchema = z.object({
  price: z.number(),
  tower: towerSchema,
});

export type TowerShopItem = Infer<typeof towerShopItemSchema>;
export const mockTowerShopItem = () => generateMock(towerShopItemSchema);
