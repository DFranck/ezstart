import { z, type Infer as ZodInfer } from '@ezstart/types';

export const companyBaseSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('User ID who owns this company'),

  companyName: z
    .string()
    .min(1, 'Company name is required')
    .describe('Name of the company'),

  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal(''))
    .describe('Company email address'),

  phone: z.string().optional().describe('Company phone number'),

  address: z.string().optional().describe('Company address'),
  city: z.string().optional().describe('Company city'),
  postalCode: z.string().optional().describe('Company postal code'),
  country: z.string().optional().describe('Company country'),

  companyRegistrationNumber: z
    .string()
    .optional()
    .describe('Company registration number (SIRET, etc.)'),

  taxNumber: z
    .string()
    .optional()
    .describe('VAT / tax identification number'),

  website: z.string().url().optional().or(z.literal('')).describe('Company website'),
});

export const createCompanySchema = companyBaseSchema;

export const companySchema = companyBaseSchema.extend({
  _id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('MongoDB ObjectId (24 hex chars)'),

  createdAt: z.string().describe('ISO timestamp when the company was created'),
  updatedAt: z.string().describe('ISO timestamp when the company was last updated'),
});

export type CreateCompany = ZodInfer<typeof createCompanySchema>;
export type Company = ZodInfer<typeof companySchema>;