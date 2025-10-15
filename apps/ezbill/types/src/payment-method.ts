import { z, type infer as ZodInfer } from 'zod';

export const paymentMethodTypeEnum = z.enum([
  'bank_transfer',
  'crypto_wallet', 
  'paypal',
  'stripe',
  'wise',
  'revolut',
  'other'
]);

export const paymentMethodBaseSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('User ID who owns this payment method'),

  name: z
    .string()
    .min(1, 'Payment method name is required')
    .describe('Display name for this payment method'),

  type: paymentMethodTypeEnum.describe('Type of payment method'),

  // Bank transfer fields
  bankName: z.string().optional().describe('Bank name'),
  accountNumber: z.string().optional().describe('Bank account number'),
  routingNumber: z.string().optional().describe('Bank routing/sort code'),
  iban: z.string().optional().describe('IBAN number'),
  swift: z.string().optional().describe('SWIFT/BIC code'),

  // Crypto fields
  walletAddress: z.string().optional().describe('Cryptocurrency wallet address'),
  network: z.string().optional().describe('Blockchain network (e.g., Cosmos Hub, Ethereum)'),
  currency: z.string().optional().describe('Currency/token (e.g., USDC, ETH, ATOM)'),

  // Digital payment fields (PayPal, Wise, etc.)
  email: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.string().email().optional()
  ).describe('Email for digital payments'),
  username: z.preprocess(
    (val) => val === '' ? undefined : val,
    z.string().optional()
  ).describe('Username for the service'),

  // General fields
  instructions: z.string().optional().describe('Additional payment instructions'),
  isDefault: z.boolean().default(false).describe('Whether this is the default payment method'),
});

export const createPaymentMethodSchema = paymentMethodBaseSchema;

export const paymentMethodSchema = paymentMethodBaseSchema.extend({
  _id: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('MongoDB ObjectId (24 hex chars)'),

  createdAt: z.string().describe('ISO timestamp when the payment method was created'),
  updatedAt: z.string().describe('ISO timestamp when the payment method was last updated'),
  deletedAt: z
    .string()
    .optional()
    .describe('ISO timestamp when the payment method was soft-deleted'),
});

export type PaymentMethodType = ZodInfer<typeof paymentMethodTypeEnum>;
export type CreatePaymentMethod = ZodInfer<typeof createPaymentMethodSchema>;
export type PaymentMethod = ZodInfer<typeof paymentMethodSchema>;