import { BillingClient } from '@ezstart/types';
import { Document, Schema, model } from 'mongoose';

type ClientDocument = BillingClient & Document;

const clientSchema = new Schema(
  {
    clientName: { type: String },
    address: { type: String },
    isCompany: { type: Boolean },
    phone: { type: String },
    taxNumber: { type: String },
    notes: { type: String },
    deletedAt: { type: String, default: null },
  },
  { timestamps: true }
);

export const ClientModel = model<ClientDocument>('Client', clientSchema);
