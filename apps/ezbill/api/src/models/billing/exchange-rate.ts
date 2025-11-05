import { currencyEnum, Currency } from '@ezbill/types';
import { connectToMongo } from '@ezstart/express-core';
import { Schema, Model } from 'mongoose';

export interface ExchangeRateDocument {
  from: Currency;
  to: Currency;
  rate: number;
  source: string;
  fetchedAt: Date;
}

const exchangeRateSchema = new Schema<ExchangeRateDocument>(
  {
    from: { type: String, enum: currencyEnum.options, required: true },
    to: { type: String, enum: currencyEnum.options, required: true },
    rate: { type: Number, required: true },
    source: { type: String, required: true },
    fetchedAt: { type: Date, required: true },
  },
  { bufferCommands: false }
);

/**
 * Get or create the ExchangeRate model using factory pattern
 * Ensures MongoDB connection is established before model creation
 */
export async function getExchangeRateModel(): Promise<Model<ExchangeRateDocument>> {
  const mongoose = await connectToMongo('ezbill');
  return mongoose.models.ExchangeRate || mongoose.model<ExchangeRateDocument>('ExchangeRate', exchangeRateSchema);
}
