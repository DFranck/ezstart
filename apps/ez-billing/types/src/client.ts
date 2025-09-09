import { z, type Infer as ZodInfer } from '@ezstart/types';

// Listing query schema (copied from common)
const listingQuerySchema = z.object({
  page: z.number().min(1).default(1).optional().describe('Page number for pagination'),
  limit: z.number().min(1).max(100).default(20).optional().describe('Number of items per page'),
  search: z.string().optional().describe('Search term to filter results'),
  sortBy: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional().describe('Sort order'),
});

// -----------------------------------
// 🟢 BASE (never used alone)
export const baseClientSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('User who owns this client'),

  clientName: z
    .string()
    .min(1, 'Client name is required')
    .describe('Full name of the client or company'),

  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal(''))
    .describe('Email address of the client'),

  phone: z.string().optional().describe('Phone number of the client'),

  isCompany: z.boolean().default(false).describe('true if company, false if individual'),

  // Address fields
  address: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City'),
  postalCode: z.string().optional().describe('Postal/ZIP code'),
  country: z.string().optional().describe('Country'),

  // Company specific fields
  companyRegistrationNumber: z
    .string()
    .optional()
    .describe('Company registration number (SIRET, etc.)'),

  taxNumber: z
    .string()
    .optional()
    .describe('VAT / tax identification number'),

  // Contact person fields (for companies)
  contactPersonName: z.string().optional().describe('Name of the main contact person'),
  contactPersonEmail: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal(''))
    .describe('Email of the contact person'),
  contactPersonPhone: z.string().optional().describe('Phone of the contact person'),
  contactPersonTitle: z.string().optional().describe('Job title of the contact person'),

  // Additional info
  website: z.string().url().optional().or(z.literal('')).describe('Website URL'),
  
  notes: z.string().optional().describe('Internal notes about the client'),
});

// -----------------------------------
// 🟢 INPUTS (create/update)
export const billingClientSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('User who owns this client'),
  clientName: z
    .string()
    .min(1, 'Client name is required')
    .describe('Full name of the client or company'),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal(''))
    .describe('Email address of the client'),
  phone: z.string().optional().describe('Phone number of the client'),
  isCompany: z.boolean().optional().describe('true if company, false if individual'),
  address: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City'),
  postalCode: z.string().optional().describe('Postal/ZIP code'),
  country: z.string().optional().describe('Country'),
  companyRegistrationNumber: z
    .string()
    .optional()
    .describe('Company registration number (SIRET, etc.)'),
  taxNumber: z
    .string()
    .optional()
    .describe('VAT / tax identification number'),
  // Contact person fields (for companies)
  contactPersonName: z.string().optional().describe('Name of the main contact person'),
  contactPersonEmail: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal(''))
    .describe('Email of the contact person'),
  contactPersonPhone: z.string().optional().describe('Phone of the contact person'),
  contactPersonTitle: z.string().optional().describe('Job title of the contact person'),
  website: z.string().url().optional().or(z.literal('')).describe('Website URL'),
  notes: z.string().optional().describe('Internal notes about the client'),
});

export const clientIdSchema = z.object({
  id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('MongoDB ObjectId (24 hex chars)'),
});
export type ClientId = ZodInfer<typeof clientIdSchema>;

// Output
export const clientSchema = baseClientSchema.extend({
  _id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('MongoDB ObjectId (24 hex chars)'),

  createdAt: z.string().describe('ISO timestamp when the client was created'),

  updatedAt: z
    .string()
    .describe('ISO timestamp when the client was last updated'),

  deletedAt: z
    .string()
    .optional()
    .describe('ISO timestamp when the client was soft-deleted'),
});

// -----------------------------------
// 🟡 QUERY (listing/filter)
export const getClientsQuerySchema = listingQuerySchema.extend({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('Filter clients by user ID'),
});
export type GetClientsQuery = ZodInfer<typeof getClientsQuerySchema>;

// BASE
export type BaseClient = ZodInfer<typeof baseClientSchema>;
// Inputs
export type BillingClient = ZodInfer<typeof billingClientSchema>;
// Output
export type Client = ZodInfer<typeof clientSchema>;