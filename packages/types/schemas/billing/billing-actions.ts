import { z } from 'zod';

export const addLineItemSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  quantity: z.number().min(1),
  price: z.number().min(0),
});
export type AddLineItem = z.infer<typeof addLineItemSchema>;

export const removeLineItemSchema = z.object({
  itemId: z.string().min(1),
});
export type RemoveLineItem = z.infer<typeof removeLineItemSchema>;

export const assignClientSchema = z.object({
  clientId: z.string().min(1),
});
export type AssignClientToBillingDoc = z.infer<typeof assignClientSchema>;
