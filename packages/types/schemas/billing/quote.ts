import { z } from '@ezstart/api-core';
import { infer as ZodInfer } from 'zod';
import { quoteStatusEnum } from '../../enums';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base';

export const createQuoteSchema = baseBillingDocSchema.extend({
  status: quoteStatusEnum.default('draft'),
  validUntil: z.string().optional(),
});
export const updateQuoteSchema = createQuoteSchema.partial();
export const quoteSchema = withBillingOutputFields(createQuoteSchema);
export const getQuotesQuerySchema = getBillingDocsQuerySchema(quoteStatusEnum);

export type Quote = ZodInfer<typeof quoteSchema>;
export type UpdateQuote = ZodInfer<typeof updateQuoteSchema>;
export type CreateQuote = ZodInfer<typeof createQuoteSchema>;
export type GetQuotesQuery = ZodInfer<typeof getQuotesQuerySchema>;
