import { Document, Schema, model } from 'mongoose';

// 1. Type TS pour un item de ligne de facture
export interface LineItem {
  label: string;
  quantity: number;
  price: number;
  // (ajoute un _id?: string si tu veux gérer la suppression par id)
}

// 2. Interface Invoice Document (pour auto-completion et typage fort)
export interface InvoiceDocument extends Document {
  clientId: string;
  items: LineItem[];
  currency: string;
  dueDate?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
  taxRate?: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 3. LineItem sous-schema (tableau d’objets imbriqués)
const lineItemSchema = new Schema<LineItem>(
  {
    label: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// 4. Invoice Schema principal
const invoiceSchema = new Schema<InvoiceDocument>(
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
export const InvoiceModel = model<InvoiceDocument>('Invoice', invoiceSchema);
