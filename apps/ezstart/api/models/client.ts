import type { BillingClient } from '@ezstart/types/schemas';
import { Document, Schema, model } from 'mongoose';

type ClientDocument = BillingClient & Document;

const clientSchema = new Schema(
  {
    companyName: { type: String },
    address: { type: String },
    phone: { type: String },
    taxNumber: { type: String },
    notes: { type: String },
    deletedAt: { type: String, default: null },
  },
  { timestamps: true }
);

export const ClientModel = model<ClientDocument>('Client', clientSchema);
