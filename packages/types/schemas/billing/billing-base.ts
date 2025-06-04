import { z, ZodEnum, ZodObject, ZodRawShape } from 'zod';
import { currencyEnum } from '../../enums';
import { listingQuerySchema } from '../listing';

export const baseLineItemSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  quantity: z.number().min(1),
  price: z.number().min(0),
});
export type BaseLineItem = z.infer<typeof baseLineItemSchema>;

export const lineItemSchema = baseLineItemSchema.extend({
  _id: z.string(),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const exchangeRateSchema = z.object({
  from: currencyEnum,
  to: z.string(),
  rate: z.number().min(0),
  source: z.string(),
  fetchedAt: z.string(),
});

export const baseBillingDocSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  items: z.array(baseLineItemSchema).min(1),
  currency: currencyEnum,
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
});
export type BaseBillingDoc = z.infer<typeof baseBillingDocSchema>;

export function withBillingOutputFields<T extends ZodRawShape>(
  schema: ZodObject<T>
) {
  return schema.extend({
    _id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    deletedAt: z.string().optional(),
    items: z.array(lineItemSchema),
    documentNumber: z.string(),
    exchangeRate: exchangeRateSchema,
    subtotal: z.number(),
    taxAmount: z.number(),
    total: z.number(),
  });
}

export function getBillingDocsQuerySchema<
  T extends ZodEnum<[string, ...string[]]>,
>(statusEnum: T) {
  return listingQuerySchema.extend({
    clientId: z.string().optional(),
    status: statusEnum.optional(),
    currency: currencyEnum.optional(),
  });
}
