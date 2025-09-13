import { infer as ZodInfer } from 'zod';
import { z } from 'zod';

export const addLineItemSchema = z.object({
  label: z.string().min(1, 'Label is required').describe('Line item label/description'),
  quantity: z.number().min(1).describe('Quantity of the item'),
  price: z.number().min(0).describe('Price per unit'),
});
export type AddLineItem = ZodInfer<typeof addLineItemSchema>;

export const removeLineItemSchema = z.object({
  itemId: z.string().min(1).describe('ID of the line item to remove'),
});
export type RemoveLineItem = ZodInfer<typeof removeLineItemSchema>;

export const assignClientSchema = z.object({
  clientId: z.string().min(1).describe('ID of the client to assign to the document'),
});
export type AssignClientToBillingDoc = ZodInfer<typeof assignClientSchema>;