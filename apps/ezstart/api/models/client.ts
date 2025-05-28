import type { BillingClient } from '@ezstart/types/schemas';
import { Document, Schema, model } from 'mongoose';

type ClientDocument = BillingClient & Document;

const clientSchema = new Schema({
  companyName: { type: String },
  address: { type: String },
  phone: { type: String },
  taxNumber: { type: String },
  notes: { type: String },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

export const ClientModel = model<ClientDocument>('Client', clientSchema);
