import { z } from 'zod'

// Payment schemas
export const paymentStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded',
  'cancelled',
])

export const paymentTypeSchema = z.enum(['donation', 'purchase', 'subscription', 'invoice'])

export const paymentProviderSchema = z.enum(['stripe', 'paypal'])

export const basePaymentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  type: paymentTypeSchema,
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  provider: paymentProviderSchema,
  paymentId: z.string(),
  paymentMethod: z.string().optional(),
  status: paymentStatusSchema,
  userId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email('Invalid email').optional(),
  isAnonymous: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
})

// Request schemas
export const createDonationSchema = z.object({
  projectId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  message: z.string().max(500, 'Message too long').optional(),
  isPublic: z.boolean().default(true),
  isAnonymous: z.boolean().default(false),
  userId: z.string().optional(),
  donorName: z.string().optional(),
  donorEmail: z.string().email('Invalid email').optional(),
})

export const createPurchaseSchema = z.object({
  projectId: z.string(),
  productId: z.string(),
  productName: z.string(),
  amount: z.number().positive(),
  quantity: z.number().positive().default(1),
  currency: z.string().default('EUR'),
  userId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email('Invalid email').optional(),
})

export const createSubscriptionSchema = z.object({
  projectId: z.string(),
  planId: z.string(),
  planName: z.string(),
  amount: z.number().positive(),
  interval: z.enum(['month']).default('month'),
  intervalCount: z.number().int().min(1).max(12).default(1),
  currency: z.string().default('EUR'),
  userId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email('Invalid email').optional(),
})

// Response schemas
export const paymentResponseSchema = z.object({
  success: z.boolean(),
  payment: basePaymentSchema,
  checkoutUrl: z.string().url(),
})

export const paymentsListResponseSchema = z.object({
  success: z.boolean(),
  payments: z.array(basePaymentSchema),
  total: z.number(),
})

export const statsResponseSchema = z.object({
  success: z.boolean(),
  stats: z.object({
    total: z.number(),
    count: z.number(),
    byType: z.record(
      z.string(),
      z.object({
        total: z.number(),
        count: z.number(),
      })
    ),
    recent: z.array(basePaymentSchema),
  }),
})

export const errorResponseSchema = z.object({
  success: z.boolean(),
  error: z.string(),
})
