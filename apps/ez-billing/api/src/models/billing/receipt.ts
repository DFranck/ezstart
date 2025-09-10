import { Receipt } from '@ez-billing/types';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory.js';

export const ReceiptModel = model<Receipt>(
  'Receipt',
  createBillingDocSchema(
    { 
      paymentDate: { type: String, default: Date.now() },
      invoiceId: { type: String, default: null },
    },
    ['issued', 'refunded'],
    'issued'
  )
);
