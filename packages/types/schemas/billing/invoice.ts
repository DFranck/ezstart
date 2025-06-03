import { z } from 'zod';
import { invoiceStatusEnum } from '../../enums';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base';

export const createInvoiceSchema = baseBillingDocSchema.extend({
  status: invoiceStatusEnum.default('draft'),
});
export const updateInvoiceSchema = createInvoiceSchema.partial();
export const invoiceSchema = withBillingOutputFields(createInvoiceSchema);
export const getInvoicesQuerySchema =
  getBillingDocsQuerySchema(invoiceStatusEnum);

export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;
export type CreateInvoice = z.infer<typeof createInvoiceSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type GetInvoicesQuery = z.infer<typeof getInvoicesQuerySchema>;
