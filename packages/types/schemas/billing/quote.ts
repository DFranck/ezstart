import { z } from 'zod';
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

export type Quote = z.infer<typeof quoteSchema>;
export type UpdateQuote = z.infer<typeof updateQuoteSchema>;
export type CreateQuote = z.infer<typeof createQuoteSchema>;
export type GetQuotesQuery = z.infer<typeof getQuotesQuerySchema>;
