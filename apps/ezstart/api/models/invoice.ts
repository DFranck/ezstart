import { Invoice, LineItem } from '@ezstart/types/schemas/invoice';
import { Schema, model } from 'mongoose';

const lineItemSchema = new Schema<LineItem>({
  label: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});

const invoiceSchema = new Schema<Invoice>(
  {
    clientId: { type: String, required: true },
    items: { type: [lineItemSchema], required: true },
    currency: { type: String, default: 'EUR' },
    dueDate: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid'],
      default: 'draft',
    },
    taxRate: { type: Number, min: 0, max: 100 },
    deletedAt: { type: String, default: null },
  },
  { timestamps: true }
);

// 5. Export du model
export const InvoiceModel = model<Invoice>('Invoice', invoiceSchema);
