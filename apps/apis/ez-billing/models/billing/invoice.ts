import { Invoice } from '@ezstart/types';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory';

export const InvoiceModel = model<Invoice>(
  'Invoice',
  createBillingDocSchema(
    {
      dueDate: {
        type: String,
        default: () =>
          new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    ['draft', 'sent', 'paid'],
    'draft'
  )
);
