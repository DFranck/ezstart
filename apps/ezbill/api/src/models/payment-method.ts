import { CreatePaymentMethod } from '@ezbill/types';
import { Document, Schema, model } from 'mongoose';

type PaymentMethodDocument = CreatePaymentMethod & Document;

const paymentMethodSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['bank_transfer', 'crypto_wallet', 'cash']
    },
    // Bank transfer fields
    bankName: { type: String },
    accountNumber: { type: String },
    routingNumber: { type: String },
    iban: { type: String },
    swift: { type: String },
    // Crypto wallet fields
    walletAddress: { type: String },
    network: { type: String },
    currency: { type: String },
    // Digital payment fields (PayPal, Wise, Revolut)
    email: { type: String },
    username: { type: String },
    // General fields
    instructions: { type: String },
    isDefault: { type: Boolean, default: false },
    deletedAt: { type: String, default: null },
  },
  { timestamps: true }
);

export const PaymentMethodModel = model<PaymentMethodDocument>('PaymentMethod', paymentMethodSchema);