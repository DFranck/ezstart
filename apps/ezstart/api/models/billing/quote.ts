import { Quote } from '@ezstart/types';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory';

export const QuoteModel = model<Quote>(
  'Quote',
  createBillingDocSchema(
    { validUntil: { type: String } },
    ['draft', 'sent', 'accepted', 'rejected'],
    'draft'
  )
);
