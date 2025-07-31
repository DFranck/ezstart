import { z, ZodEnum, infer as ZodInfer, ZodObject, ZodRawShape } from 'zod';
import { listingQuerySchema } from '../../common/listingQuerySchema';
import { currencyEnum } from '../enums';

export const baseLineItemSchema = z.object({
  label: z.string().min(1, 'Label is required').describe('TODO'),
  quantity: z.number().min(1).describe('TODO'),
  price: z.number().min(0).describe('TODO'),
});
export type BaseLineItem = ZodInfer<typeof baseLineItemSchema>;

export const lineItemSchema = baseLineItemSchema.extend({
  _id: z.string(),
});
export type LineItem = ZodInfer<typeof lineItemSchema>;

export const exchangeRateSchema = z.object({
  from: currencyEnum,
  to: z.string(),
  rate: z.number().min(0),
  source: z.string(),
  fetchedAt: z.string(),
});

export const baseBillingDocSchema = z.object({
  clientId: z
    .string()
    .min(1, 'Client is required')
    .describe('User id from mongo _id'),
  items: z.array(baseLineItemSchema).min(1).describe('TODO'),
  currency: currencyEnum.describe('Billing using currency'),
  dueDate: z.string().optional().describe('TODO'),
  notes: z.string().optional().describe('TODO'),
  terms: z.string().optional().describe('TODO'),
  taxRate: z.number().min(0).max(100).optional().describe('TODO'),
});
export type BaseBillingDoc = ZodInfer<typeof baseBillingDocSchema>;

export function withBillingOutputFields<T extends ZodRawShape>(
  schema: ZodObject<T>
) {
  return schema.extend({
    _id: z.string().describe('TODO'),
    createdAt: z.string().describe('TODO'),
    updatedAt: z.string().describe('TODO'),
    deletedAt: z.string().optional().describe('TODO'),
    items: z.array(lineItemSchema).describe('TODO'),
    documentNumber: z.string().describe('TODO'),
    exchangeRate: exchangeRateSchema.describe('TODO'),
    subtotal: z.number().describe('TODO'),
    taxAmount: z.number().describe('TODO'),
    total: z.number().describe('TODO'),
  });
}

export function getBillingDocsQuerySchema<
  T extends ZodEnum<[string, ...string[]]>,
>(statusEnum: T) {
  return listingQuerySchema.extend({
    clientId: z.string().optional().describe('TODO'),
    status: statusEnum.optional().describe('TODO'),
    currency: currencyEnum.optional().describe('TODO'),
  });
}
