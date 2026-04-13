/**
 * GET /api/admin/services
 *
 * Aggregated status of all external providers used by the monorepo
 * (Vercel, Railway, MongoDB Atlas, Stripe, Resend).
 *
 * Protected by admin role. Cached in memory for 5 minutes.
 */

import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
  createRoleMiddleware,
} from '@ezstart/express-core'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../../middleware/auth.js'
import { getAllProviderStatuses, clearProviderCache } from '../../services/providers/aggregator.js'

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

const { requireAdmin } = createRoleMiddleware()

// ========================================
// Zod Schemas
// ========================================

const usageMetricSchema = z.object({
  label: z.string(),
  current: z.number(),
  limit: z.number().nullable(),
  unit: z.string(),
  percentage: z.number().optional(),
})

const providerStatusSchema = z.object({
  provider: z.enum(['vercel', 'railway', 'mongodb', 'stripe', 'resend', 'github']),
  displayName: z.string(),
  plan: z.string(),
  monthlyCostEstimate: z.number(),
  usage: z.array(usageMetricSchema),
  status: z.enum(['healthy', 'warning', 'critical', 'unknown']),
  statusMessage: z.string().optional(),
  lastSync: z.string(),
  dashboardUrl: z.string(),
  error: z.string().optional(),
})

const providerStatusListSchema = z.object({
  providers: z.array(providerStatusSchema),
  cacheTtlSeconds: z.number(),
  generatedAt: z.string(),
})

// ========================================
// Handlers
// ========================================

const listServicesHandler = async (req: Request, res: Response) => {
  try {
    const force = req.query.refresh === 'true' || req.query.refresh === '1'
    if (force) clearProviderCache()
    const result = await getAllProviderStatuses({ force })
    sendSuccess(res, result)
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to fetch provider statuses')
  }
}

// ========================================
// Route Registration
// ========================================

// Admin-only: auth + role check
docRouter.get('/services', authMiddleware, requireAdmin, listServicesHandler, {
  summary: 'Get aggregated status of all external providers',
  tags: ['Admin', 'Services'],
  responseSchema: providerStatusListSchema,
})

export default router as ReturnType<typeof Router>
