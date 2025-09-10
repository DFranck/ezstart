import { currencyEnum } from '@ez-billing/types';
import { Schema, model } from 'mongoose';

const ExchangeRateSchema = new Schema({
  from: { type: String, enum: currencyEnum.options, required: true },
  to: { type: String, enum: currencyEnum.options, required: true },
  rate: { type: Number, required: true },
  source: { type: String, required: true },
  fetchedAt: { type: Date, required: true },
});

export default model('ExchangeRate', ExchangeRateSchema);
