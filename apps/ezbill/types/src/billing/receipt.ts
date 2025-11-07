import { z, type infer as ZodInfer } from 'zod';
import { receiptStatusEnum } from '../enums/index.js';
import {
  baseBillingDocSchemaRaw,
  addBillingTypeValidation,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base.js';

// Extend raw schema first, then apply validation
const createReceiptSchemaRaw = baseBillingDocSchemaRaw.extend({
  status: receiptStatusEnum.default('issued').describe('Receipt status'),
  paymentDate: z.string().optional().describe('Date when payment was received (ISO date string)'),
  invoiceId: z.string().optional().describe('Reference to the invoice this receipt was generated from'),
});

export const createReceiptSchema = addBillingTypeValidation(createReceiptSchemaRaw);
export const updateReceiptSchema = createReceiptSchemaRaw.partial();
export const receiptSchema = withBillingOutputFields(createReceiptSchemaRaw);
export const getReceiptsQuerySchema =
  getBillingDocsQuerySchema(receiptStatusEnum);

export type Receipt = ZodInfer<typeof receiptSchema>;
export type UpdateReceipt = ZodInfer<typeof updateReceiptSchema>;
export type CreateReceipt = ZodInfer<typeof createReceiptSchema>;
export type GetReceiptsQuery = ZodInfer<typeof getReceiptsQuerySchema>;