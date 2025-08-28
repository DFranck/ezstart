import { z, type Infer as ZodInfer } from '@ezstart/types';
import { receiptStatusEnum } from '../enums/index.js';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base.js';

export const createReceiptSchema = baseBillingDocSchema.extend({
  status: receiptStatusEnum.default('issued').describe('Receipt status'),
  paymentDate: z.string().optional().describe('Date when payment was received (ISO date string)'),
});
export const updateReceiptSchema = createReceiptSchema.partial();
export const receiptSchema = withBillingOutputFields(createReceiptSchema);
export const getReceiptsQuerySchema =
  getBillingDocsQuerySchema(receiptStatusEnum);

export type Receipt = ZodInfer<typeof receiptSchema>;
export type UpdateReceipt = ZodInfer<typeof updateReceiptSchema>;
export type CreateReceipt = ZodInfer<typeof createReceiptSchema>;
export type GetReceiptsQuery = ZodInfer<typeof getReceiptsQuerySchema>;