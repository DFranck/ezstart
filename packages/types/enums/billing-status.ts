import { z } from 'zod';

export const invoiceStatusEnum = z.enum(['draft', 'sent', 'paid']);
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;

export const quoteStatusEnum = z.enum([
  'draft',
  'sent',
  'accepted',
  'rejected',
]);
export type QuoteStatus = z.infer<typeof quoteStatusEnum>;

export const receiptStatusEnum = z.enum(['issued', 'refunded']);
export type ReceiptStatus = z.infer<typeof receiptStatusEnum>;

export const currencyEnum = z.enum([
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'JPY', // Japanese Yen
  'VND', // Vietnamese Dong
  'THB', // Thai Baht
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CNY', // Chinese Yuan
  'CHF', // Swiss Franc
]);
export type Currency = z.infer<typeof currencyEnum>;
