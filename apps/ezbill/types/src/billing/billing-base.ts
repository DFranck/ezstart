import { z, type infer as ZodInfer } from 'zod';
import type { ZodEnum, ZodObject, ZodRawShape } from 'zod';
import { currencyEnum } from '../enums/index.js';

// Listing query schema (copied from common)
const listingQuerySchema = z.object({
  page: z.number().min(1).default(1).optional().describe('Page number for pagination'),
  limit: z.number().min(1).max(100).default(20).optional().describe('Number of items per page'),
  search: z.string().optional().describe('Search term to filter results'),
  sortBy: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional().describe('Sort order'),
});

export const baseLineItemSchema = z.object({
  label: z.string().min(1, 'Label is required').describe('Description or name of the line item'),
  quantity: z.number().min(1).describe('Quantity of the item'),
  price: z.number().min(0).describe('Unit price of the item'),
});
export type BaseLineItem = ZodInfer<typeof baseLineItemSchema>;

export const lineItemSchema = baseLineItemSchema.extend({
  _id: z.string(),
});
export type LineItem = ZodInfer<typeof lineItemSchema>;

export const exchangeRateSchema = z.object({
  from: currencyEnum,
  to: z.string(),
  rate: z.number().min(0),
  source: z.string(),
  fetchedAt: z.string(),
});

// Enum for billing type
export const billingTypeEnum = z.enum(['itemized', 'flat-rate']).describe('Type of billing: itemized (line items) or flat-rate (single description + price)');
export type BillingType = z.infer<typeof billingTypeEnum>;

// Base schema WITHOUT validation - used for extending
export const baseBillingDocSchemaRaw = z.object({
  userId: z
    .string()
    .min(1, 'User ID is required')
    .describe('User who created this billing document'),
  clientId: z
    .string()
    .min(1, 'Client is required')
    .describe('Client identifier from mongo _id'),
  companyId: z
    .string()
    .optional()
    .describe('Optional company identifier - bill on behalf of this company'),
  billingType: billingTypeEnum.default('itemized').describe('Billing type: itemized or flat-rate'),
  items: z.array(baseLineItemSchema).optional().describe('List of billing line items (required for itemized type)'),
  description: z.string().optional().describe('Flat-rate description (required for flat-rate type)'),
  flatRateAmount: z.number().min(0).optional().describe('Flat-rate amount (required for flat-rate type)'),
  currency: currencyEnum.describe('Currency used for billing'),
  dueDate: z.string().optional().describe('Due date for payment (ISO date string)'),
  notes: z.string().optional().describe('Additional notes for the billing document'),
  terms: z.string().optional().describe('Payment terms and conditions'),
  taxRate: z.number().min(0).max(100).optional().describe('Tax rate percentage (0-100)'),
  paymentMethodId: z.string().optional().describe('DEPRECATED: Use paymentMethodIds instead'),
  paymentMethodIds: z.array(z.string()).optional().describe('Payment method identifiers to display on invoice'),
  aiConversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('AI assistant conversation history for this invoice/quote'),
});

// Validation function to be applied after extending
export function addBillingTypeValidation<T extends typeof baseBillingDocSchemaRaw>(schema: T) {
  return schema.superRefine((data, ctx) => {
    // Validate itemized type
    if (data.billingType === 'itemized') {
      if (!data.items || data.items.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Items are required for itemized billing type',
          path: ['items'],
        });
      }
    }

    // Validate flat-rate type
    if (data.billingType === 'flat-rate') {
      if (!data.description || data.description.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Description is required for flat-rate billing type',
          path: ['description'],
        });
      }
      if (data.flatRateAmount === undefined || data.flatRateAmount === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flat-rate amount is required for flat-rate billing type',
          path: ['flatRateAmount'],
        });
      }
    }
  });
}

// Base schema WITH validation - for direct use
export const baseBillingDocSchema = addBillingTypeValidation(baseBillingDocSchemaRaw);
export type BaseBillingDoc = ZodInfer<typeof baseBillingDocSchema>;

export function withBillingOutputFields<T extends ZodRawShape>(
  schema: ZodObject<T>
) {
  return schema.extend({
    _id: z.string().describe('MongoDB ObjectId of the document'),
    createdAt: z.string().describe('ISO timestamp when document was created'),
    updatedAt: z.string().describe('ISO timestamp when document was last updated'),
    deletedAt: z.string().optional().describe('ISO timestamp when document was soft-deleted'),
    items: z.array(lineItemSchema).describe('List of line items with IDs'),
    documentNumber: z.string().describe('Unique document number for this billing document'),
    exchangeRate: exchangeRateSchema.describe('Exchange rate used for currency conversion'),
    subtotal: z.number().describe('Subtotal before tax'),
    taxAmount: z.number().describe('Total tax amount'),
    total: z.number().describe('Final total amount'),
  });
}

export function getBillingDocsQuerySchema<
  T extends ZodEnum<[string, ...string[]]>,
>(statusEnum: T) {
  return listingQuerySchema.extend({
    clientId: z.string().optional().describe('Filter by client ID'),
    status: statusEnum.optional().describe('Filter by document status'),
    currency: currencyEnum.optional().describe('Filter by currency'),
  });
}