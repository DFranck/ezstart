import { generateMock } from '@anatine/zod-mock';
import { z, type Infer } from '../zod-extended';
import { mobSchema } from './mob';
import { towerSchema } from './tower';

export const shopItemSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string().describe('Tower name'),
    type: z.literal('tower'),
    price: z.number(),
    tower: towerSchema,
  }),
  z.object({
    name: z.string().describe('Unit name'),
    type: z.literal('unit'),
    price: z.number(),
    unit: mobSchema,
  }),
]);

export type ShopItem = Infer<typeof shopItemSchema>;
export const mockShopItem = generateMock(shopItemSchema);
export const mockShopItems = generateMock(z.array(shopItemSchema));
