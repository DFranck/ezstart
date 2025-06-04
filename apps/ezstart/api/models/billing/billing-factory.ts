import { currencyEnum } from '@ezstart/types';
import { Schema } from 'mongoose';
import { baseLineItemSchema } from './billing-base';

export function createBillingDocSchema(
  extra: Record<string, any>,
  statusEnum: string[],
  statusDefault: string
) {
  return new Schema(
    {
      clientId: { type: String, required: true },
      items: { type: [baseLineItemSchema], required: true },
      currency: { type: String, enum: currencyEnum.options, default: 'USD' },
      exchangeRate: {
        type: {
          from: { type: String, enum: currencyEnum.options, required: true },
          to: { type: String, enum: currencyEnum.options, required: true },
          rate: { type: Number, required: true },
          source: { type: String, required: true },
          fetchedAt: { type: Date, required: true },
        },
        required: true,
      },
      dueDate: { type: String },
      notes: { type: String },
      status: {
        type: String,
        enum: statusEnum,
        default: statusDefault,
      },
      taxRate: { type: Number, min: 0, max: 100 },
      deletedAt: { type: String, default: null },
      documentNumber: { type: String, required: true, unique: true },
      subtotal: { type: Number, required: false },
      taxAmount: { type: Number, required: false },
      total: { type: Number, required: false },
      ...extra,
    },
    { timestamps: true }
  );
}
