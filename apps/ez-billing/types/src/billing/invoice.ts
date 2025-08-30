import { z, type Infer as ZodInfer } from '@ezstart/types';
import { invoiceStatusEnum } from '../enums/index.js';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base.js';

export const createInvoiceSchema = baseBillingDocSchema.extend({
  status: invoiceStatusEnum.default('draft').describe('Invoice status'),
  quoteId: z.string().optional().describe('Reference to the quote this invoice was created from'),
});
export const updateInvoiceSchema = createInvoiceSchema.partial();
export const invoiceSchema = withBillingOutputFields(createInvoiceSchema);
export const getInvoicesQuerySchema =
  getBillingDocsQuerySchema(invoiceStatusEnum);

export type UpdateInvoice = ZodInfer<typeof updateInvoiceSchema>;
export type CreateInvoice = ZodInfer<typeof createInvoiceSchema>;
export type Invoice = ZodInfer<typeof invoiceSchema>;
export type GetInvoicesQuery = ZodInfer<typeof getInvoicesQuerySchema>;