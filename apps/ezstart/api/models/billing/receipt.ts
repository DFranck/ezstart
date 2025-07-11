import { Receipt } from '@ezstart/types';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory';

export const ReceiptModel = model<Receipt>(
  'Receipt',
  createBillingDocSchema(
    { paymentDate: { type: String, default: Date.now() } },
    ['issued', 'refunded'],
    'issued'
  )
);
