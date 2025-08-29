import { CreateCompany } from '@ez-billing/types';
import { Document, Schema, model } from 'mongoose';

type CompanyDocument = CreateCompany & Document;

const companySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
    companyRegistrationNumber: { type: String },
    taxNumber: { type: String },
    website: { type: String },
  },
  { timestamps: true }
);

export const CompanyModel = model<CompanyDocument>('Company', companySchema);