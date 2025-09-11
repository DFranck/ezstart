import { z, type infer as ZodInfer } from 'zod';
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

// Schema for converting quote to invoice
export const convertQuoteToInvoiceSchema = z.object({
  dueDate: z.string().optional().describe('Due date for the generated invoice (ISO date string)'),
  notes: z.string().optional().describe('Additional notes for the invoice'),
  taxRate: z.number().min(0).max(100).optional().describe('Tax rate percentage (0-100)'),
});

export type Quote = ZodInfer<typeof quoteSchema>;
export type UpdateQuote = ZodInfer<typeof updateQuoteSchema>;
export type CreateQuote = ZodInfer<typeof createQuoteSchema>;
export type GetQuotesQuery = ZodInfer<typeof getQuotesQuerySchema>;
export type ConvertQuoteToInvoice = ZodInfer<typeof convertQuoteToInvoiceSchema>;