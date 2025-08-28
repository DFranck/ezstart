import { z, type Infer as ZodInfer } from '@ezstart/types';
import { quoteStatusEnum } from '../enums/index.js';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base.js';

export const createQuoteSchema = baseBillingDocSchema.extend({
  status: quoteStatusEnum.default('draft').describe('Quote status'),
  validUntil: z.string().optional().describe('Quote validity expiration date (ISO date string)'),
});
export const updateQuoteSchema = createQuoteSchema.partial();
export const quoteSchema = withBillingOutputFields(createQuoteSchema);
export const getQuotesQuerySchema = getBillingDocsQuerySchema(quoteStatusEnum);

export type Quote = ZodInfer<typeof quoteSchema>;
export type UpdateQuote = ZodInfer<typeof updateQuoteSchema>;
export type CreateQuote = ZodInfer<typeof createQuoteSchema>;
export type GetQuotesQuery = ZodInfer<typeof getQuotesQuerySchema>;