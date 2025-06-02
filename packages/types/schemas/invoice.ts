import { z } from 'zod';
import { getPaginatedListQuerySchema } from './listing';

// -----------------------------------
// 🟢 BASE (never used alone)
export const baseLineItemSchema = z.object({
  label: z.string().min(1),
  quantity: z.number().min(1),
  price: z.number().min(0),
});
export type BaseLineItem = z.infer<typeof baseLineItemSchema>;

// -----------------------------------
// 🟢 INPUTS (création/update)

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  items: z.array(baseLineItemSchema).min(1),
  currency: z.string().min(1).default('EUR'),
  dueDate: z.string().optional(), // ISO
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid']).default('draft'),
  taxRate: z.number().min(0).max(100).optional(),
});
export type CreateInvoice = z.infer<typeof createInvoiceSchema>;

// Pour PATCH/PUT (update partiel)
export const updateInvoiceSchema = createInvoiceSchema.partial();
export type UpdateInvoice = z.infer<typeof updateInvoiceSchema>;

// Schéma pour ajouter un item
export const addLineItemSchema = baseLineItemSchema;
export type AddLineItem = z.infer<typeof addLineItemSchema>;

// Schéma pour retirer un item d'une facture (par son id)
export const removeLineItemSchema = z.object({
  itemId: z.string().min(1),
});
export type RemoveLineItem = z.infer<typeof removeLineItemSchema>;

// Schéma pour assigner un client à une facture
export const assignClientSchema = z.object({
  clientId: z.string().min(1),
});
export type AssignClientToInvoice = z.infer<typeof assignClientSchema>;

// Schéma de validation pour l'id d'une facture
export const invoiceIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
});
export type InvoiceId = z.infer<typeof invoiceIdSchema>;

export const lineItemSchema = baseLineItemSchema.extend({
  _id: z.string(),
});
export type LineItem = z.infer<typeof lineItemSchema>;

// -----------------------------------
// 🔵 OUTPUT (API/front)
export const invoiceSchema = createInvoiceSchema.extend({
  _id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
  items: z.array(lineItemSchema),
});
export type Invoice = z.infer<typeof invoiceSchema>;

// -----------------------------------
// 🟡 QUERY (listing/filter)
export const getInvoicesQuerySchema = getPaginatedListQuerySchema.extend({
  clientId: z.string().optional(),
  status: z.enum(['draft', 'sent', 'paid']).optional(),
  currency: z.string().optional(),
});
export type GetInvoicesQuery = z.infer<typeof getInvoicesQuerySchema>;
