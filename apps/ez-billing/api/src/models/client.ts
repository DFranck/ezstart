import { BillingClient } from '@ez-billing/types';
import { Document, Schema, model } from 'mongoose';

type ClientDocument = BillingClient & Document;

const clientSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    isCompany: { type: Boolean, default: false },
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
    companyRegistrationNumber: { type: String },
    taxNumber: { type: String },
    // Contact person fields (for companies)
    contactPersonName: { type: String },
    contactPersonEmail: { type: String },
    contactPersonPhone: { type: String },
    contactPersonTitle: { type: String },
    website: { type: String },
    notes: { type: String },
    deletedAt: { type: String, default: null },
  },
  { timestamps: true }
);

export const ClientModel = model<ClientDocument>('Client', clientSchema);
