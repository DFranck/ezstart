import { Quote } from '@ezstart/types';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory';

export const QuoteModel = model<Quote>(
  'Quote',
  createBillingDocSchema(
    {
      validUntil: {
        type: String,
        default: () =>
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    ['draft', 'sent', 'accepted', 'rejected'],
    'draft'
  )
);
