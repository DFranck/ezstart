import { z } from 'zod';
import { quoteStatusEnum } from '../../enums';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base';
import { mongoIdSchema } from '../mongo-id';

export const createQuoteSchema = baseBillingDocSchema.extend({
  status: quoteStatusEnum.default('draft'),
  validUntil: z.string().optional(),
});
export type CreateQuote = z.infer<typeof createQuoteSchema>;

export const quoteSchema = withBillingOutputFields(createQuoteSchema);
export type Quote = z.infer<typeof quoteSchema>;

export const quoteIdSchema = z.object({ id: mongoIdSchema });

export const getQuotesQuerySchema = getBillingDocsQuerySchema(quoteStatusEnum);
export type GetQuotesQuery = z.infer<typeof getQuotesQuerySchema>;
