import { z, type Infer } from '../zod-extended';

export const shopItemSchema = z.object({
  id: z.string().describe('Unique ID of the shop item'),
  name: z.string().describe('Name of the item'),
  type: z.enum(['tower', 'unit']).describe('Item type'),
  price: z.number().describe('Price in gold'),
});

export type ShopItem = Infer<typeof shopItemSchema>;
