import { Invoice } from '@ez-billing/types';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory.js';

export const InvoiceModel = model<Invoice>(
  'Invoice',
  createBillingDocSchema(
    {
      dueDate: {
        type: String,
        default: () =>
          new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      quoteId: { type: String, default: null },
      paymentMethodId: { type: String, required: false },
    },
    ['draft', 'sent', 'paid'],
    'draft'
  )
);
