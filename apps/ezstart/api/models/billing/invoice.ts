import { Invoice } from '@ezstart/types';
import { model } from 'mongoose';
import { createBillingDocSchema } from './billing-factory';

export const InvoiceModel = model<Invoice>(
  'Invoice',
  createBillingDocSchema({}, ['draft', 'sent', 'paid'], 'draft')
);
