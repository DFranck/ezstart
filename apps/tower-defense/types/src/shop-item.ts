import { generateMock } from '@anatine/zod-mock';
import { z, type infer } from 'zod';
import { mobSchema } from './mob.js';
import { towerSchema } from './tower.js';

export const shopItemSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tower'),
    price: z.number(),
    tower: towerSchema,
  }),
  z.object({
    type: z.literal('unit'),
    price: z.number(),
    unit: mobSchema,
  }),
]);

export type ShopItem = z.infer<typeof shopItemSchema>;
export const mockShopItem = generateMock(shopItemSchema);
export const mockShopItems = generateMock(z.array(shopItemSchema));
