import { z } from 'zod';
import { receiptStatusEnum } from '../../enums';
import { mongoIdSchema } from '../mongo-id';
import {
  baseBillingDocSchema,
  getBillingDocsQuerySchema,
  withBillingOutputFields,
} from './billing-base';

export const createReceiptSchema = baseBillingDocSchema.extend({
  status: receiptStatusEnum.default('issued'),
  paymentDate: z.string().optional(),
});
export type CreateReceipt = z.infer<typeof createReceiptSchema>;

export const receiptSchema = withBillingOutputFields(createReceiptSchema);
export type Receipt = z.infer<typeof receiptSchema>;

export const receiptIdSchema = z.object({ id: mongoIdSchema });

export const getReceiptsQuerySchema =
  getBillingDocsQuerySchema(receiptStatusEnum);
export type GetReceiptsQuery = z.infer<typeof getReceiptsQuerySchema>;
