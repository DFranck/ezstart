import { BillingClient } from '@ezbill/types';
import { connectToMongo } from '@ezstart/express-core';
import { Document, Schema, Model } from 'mongoose';

export type ClientDocument = BillingClient & Document;

const clientSchema = new Schema<ClientDocument>(
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
  {
    timestamps: true,
    bufferCommands: false, // Disable buffering for fail-fast
  }
);

/**
 * Factory function to get Client model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getClientModel(): Promise<Model<ClientDocument>> {
  const mongoose = await connectToMongo('ezbill');
  return mongoose.models.Client || mongoose.model<ClientDocument>('Client', clientSchema);
}
