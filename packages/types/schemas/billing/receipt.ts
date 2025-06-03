import { z } from 'zod';
import { receiptStatusEnum } from '../../enums';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base';

export const createReceiptSchema = baseBillingDocSchema.extend({
  status: receiptStatusEnum.default('issued'),
  paymentDate: z.string().optional(),
});
export const receiptSchema = withBillingOutputFields(createReceiptSchema);
export const getReceiptsQuerySchema =
  getBillingDocsQuerySchema(receiptStatusEnum);

export type Receipt = z.infer<typeof receiptSchema>;
export type CreateReceipt = z.infer<typeof createReceiptSchema>;
export type GetReceiptsQuery = z.infer<typeof getReceiptsQuerySchema>;
