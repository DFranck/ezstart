import { infer as ZodInfer } from 'zod';
import { receiptStatusEnum } from '../../enums';
import { z } from '../../zod-extended';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base';

export const createReceiptSchema = baseBillingDocSchema.extend({
  status: receiptStatusEnum.default('issued'),
  paymentDate: z.string().optional(),
});
export const updateReceiptSchema = createReceiptSchema.partial();
export const receiptSchema = withBillingOutputFields(createReceiptSchema);
export const getReceiptsQuerySchema =
  getBillingDocsQuerySchema(receiptStatusEnum);

export type Receipt = ZodInfer<typeof receiptSchema>;
export type UpdateReceipt = ZodInfer<typeof updateReceiptSchema>;
export type CreateReceipt = ZodInfer<typeof createReceiptSchema>;
export type GetReceiptsQuery = ZodInfer<typeof getReceiptsQuerySchema>;
