import { Invoice } from '@ezstart/types/schemas/billing/invoice';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory';

export const InvoiceModel = model<Invoice>(
  'Invoice',
  createBillingDocSchema({}, ['draft', 'sent', 'paid'], 'draft')
);
