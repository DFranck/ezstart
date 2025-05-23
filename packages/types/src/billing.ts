// Path: packages/types/src/billing.ts

// 1️⃣ — ENUMS

export enum BillingCurrency {
  EUR = 'EUR',
  USD = 'USD',
  VND = 'VND',
  GBP = 'GBP',
  // Add more as needed
}

export enum BillingStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

export enum BillingType {
  QUOTE = 'QUOTE',
  RECEIPT = 'RECEIPT',
  INVOICE = 'INVOICE', // For future extension
}

// 2️⃣ — CORE MODELS

export interface BillingItem {
  id: string;
  label: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  total: number; // = unitPrice * quantity (computed)
}

export interface BillingParty {
  name: string;
  address: string;
  email?: string;
  phone?: string;
  taxId?: string; // SIRET, VAT, etc.
}

// 3️⃣ — COMMON BASE

export interface BillingBase {
  id: string;
  type: BillingType;
  status: BillingStatus;
  date: string; // ISO Date
  dueDate?: string; // For quote or invoice
  currency: BillingCurrency;
  from: BillingParty; // Émetteur
  to: BillingParty; // Client
  items: BillingItem[];
  subtotal: number;
  taxRate?: number; // ex: 0.2 for 20%
  taxAmount?: number;
  total: number;
  notes?: string;
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
}

// 4️⃣ — SPECIFIC TYPES

// Devis (Quote)
export interface Quote extends BillingBase {
  id: string;
  clientName: string;
  amount: number;
  type: BillingType.QUOTE;
  acceptedAt?: string; // ISO Date
}

// Reçu (Receipt)
export interface Receipt extends BillingBase {
  type: BillingType.RECEIPT;
  paidAt: string; // ISO Date
  paymentMethod?: string;
  reference?: string; // ex: bank transfer ref
}

export type BillingDocument = Quote | Receipt;
