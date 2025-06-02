import { Receipt } from '@ezstart/types/schemas/billing/receipt';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory';

export const ReceiptModel = model<Receipt>(
  'Receipt',
  createBillingDocSchema(
    { paymentDate: { type: String } },
    ['issued', 'refunded'],
    'issued'
  )
);
