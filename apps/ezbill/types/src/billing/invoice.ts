import { z, type infer as ZodInfer } from 'zod';
import { invoiceStatusEnum } from '../enums/index.js';
import {
  baseBillingDocSchemaRaw,
  addBillingTypeValidation,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base.js';

// Extend raw schema first, then apply validation
const createInvoiceSchemaRaw = baseBillingDocSchemaRaw.extend({
  status: invoiceStatusEnum.default('draft').describe('Invoice status'),
  quoteId: z.string().optional().describe('Reference to the quote this invoice was created from'),
  paidAt: z.string().optional().describe('ISO timestamp when invoice was marked as paid'),
});

export const createInvoiceSchema = addBillingTypeValidation(createInvoiceSchemaRaw);
export const updateInvoiceSchema = createInvoiceSchemaRaw.partial();
export const invoiceSchema = withBillingOutputFields(createInvoiceSchemaRaw);
export const getInvoicesQuerySchema =
  getBillingDocsQuerySchema(invoiceStatusEnum);

export type UpdateInvoice = ZodInfer<typeof updateInvoiceSchema>;
export type CreateInvoice = ZodInfer<typeof createInvoiceSchema>;
export type Invoice = ZodInfer<typeof invoiceSchema>;
export type GetInvoicesQuery = ZodInfer<typeof getInvoicesQuerySchema>;