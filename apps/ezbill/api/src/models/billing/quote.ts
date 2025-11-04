import { Quote } from '@ezbill/types';
import { connectToMongo } from '@ezstart/express-core';
import { Model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory.js';

export type QuoteDocument = Quote;

const quoteSchema = createBillingDocSchema(
  {
    validUntil: {
      type: String,
      default: () =>
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    paymentMethodId: { type: String, required: false }, // DEPRECATED: Use paymentMethodIds
    paymentMethodIds: { type: [String], required: false }, // Array of payment method IDs
  },
  ['draft', 'sent', 'accepted', 'rejected', 'converted'],
  'draft'
);

/**
 * Factory function to get Quote model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getQuoteModel(): Promise<Model<QuoteDocument>> {
  const mongoose = await connectToMongo('ezbill');
  return mongoose.models.Quote || mongoose.model<QuoteDocument>('Quote', quoteSchema);
}
