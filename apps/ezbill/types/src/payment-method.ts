import { z, type infer as ZodInfer } from 'zod';

export const paymentMethodTypeEnum = z.enum([
  'bank_transfer',
  'crypto_wallet',
  'cash',
]);

// Base schema avec champs communs
const baseFields = z.object({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId')
    .describe('User ID who owns this payment method'),

  name: z
    .string()
    .min(1, 'Payment method name is required')
    .describe('Display name for this payment method'),

  type: paymentMethodTypeEnum.describe('Type of payment method'),

  instructions: z.string().optional().describe('Additional payment instructions'),
  isDefault: z.boolean().default(false).describe('Whether this is the default payment method'),
});

// Validation intelligente IBAN (supporte tous les pays européens + internationaux)
const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;

// Schemas spécifiques par type (sans validation pour pouvoir merge)
const bankTransferBaseSchema = baseFields.extend({
  type: z.literal('bank_transfer'),
  bankName: z.string().min(1, 'Bank name is required').describe('Bank name'),
  // European/International (SEPA)
  iban: z.string().regex(ibanRegex, 'Invalid IBAN format').optional().describe('IBAN (Europe, Middle East, Africa)'),
  swift: z.string().min(8).max(11).optional().describe('BIC/SWIFT code (8 or 11 characters)'),
  // USA/Canada
  accountNumber: z.string().optional().describe('Account number (USA, Canada, Asia)'),
  routingNumber: z.string().optional().describe('Routing number (USA) or Sort code (UK)'),
});

// Schema avec validation (pour création)
const bankTransferSchema = bankTransferBaseSchema.refine(
  data => {
    // Au moins IBAN OU accountNumber doit être fourni
    return data.iban || data.accountNumber;
  },
  {
    message: 'Either IBAN or Account Number is required',
    path: ['iban'], // Affiche l'erreur sur le champ IBAN
  }
);

const cryptoWalletSchema = baseFields.extend({
  type: z.literal('crypto_wallet'),
  walletAddress: z.string().min(1, 'Wallet address is required').describe('Cryptocurrency wallet address'),
  network: z.string().min(1, 'Network is required').describe('Blockchain network (e.g., Ethereum, Cosmos)'),
  currency: z.string().min(1, 'Currency is required').describe('Currency/token (e.g., USDC, ETH, ATOM)'),
});

const cashSchema = baseFields.extend({
  type: z.literal('cash'),
  // Aucun champ requis pour cash - juste une méthode de paiement manuelle
});

// Union (avec refine, on ne peut pas utiliser discriminatedUnion)
export const paymentMethodBaseSchema = z.union([
  bankTransferSchema,
  cryptoWalletSchema,
  cashSchema,
]);

export const createPaymentMethodSchema = paymentMethodBaseSchema;

// Schema pour updates (tous les champs optionnels sauf userId)
export const updatePaymentMethodSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId'),
  type: paymentMethodTypeEnum.optional(),
  name: z.string().min(1).optional(),
  instructions: z.string().optional(),
  isDefault: z.boolean().optional(),
  // Bank transfer fields
  iban: z.string().regex(ibanRegex).optional(),
  swift: z.string().min(8).max(11).optional(),
  bankName: z.string().min(1).optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  // Crypto fields
  walletAddress: z.string().optional(),
  network: z.string().optional(),
  currency: z.string().optional(),
});

// Champs MongoDB ajoutés après création
const mongoFields = z.object({
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

// Schémas avec MongoDB fields pour chaque type (utilise baseSchema sans validation)
const bankTransferWithMongo = bankTransferBaseSchema.merge(mongoFields).refine(
  data => data.iban || data.accountNumber,
  {
    message: 'Either IBAN or Account Number is required',
    path: ['iban'],
  }
);
const cryptoWalletWithMongo = cryptoWalletSchema.merge(mongoFields);
const cashWithMongo = cashSchema.merge(mongoFields);

export const paymentMethodSchema = z.union([
  bankTransferWithMongo,
  cryptoWalletWithMongo,
  cashWithMongo,
]);

export type PaymentMethodType = ZodInfer<typeof paymentMethodTypeEnum>;
export type CreatePaymentMethod = ZodInfer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethod = ZodInfer<typeof updatePaymentMethodSchema>;
export type PaymentMethod = ZodInfer<typeof paymentMethodSchema>;