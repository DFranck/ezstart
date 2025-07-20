import { infer as ZodInfer } from 'zod';
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

export type UpdateInvoice = ZodInfer<typeof updateInvoiceSchema>;
export type CreateInvoice = ZodInfer<typeof createInvoiceSchema>;
export type Invoice = ZodInfer<typeof invoiceSchema>;
export type GetInvoicesQuery = ZodInfer<typeof getInvoicesQuerySchema>;
