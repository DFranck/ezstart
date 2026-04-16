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
  label: z.string().describe('Human-readable metric label (e.g. "Bandwidth", "Invocations")'),
  current: z.number().describe('Current usage value'),
  limit: z.number().nullable().describe('Plan limit (null when unlimited)'),
  unit: z.string().describe('Unit of measurement (e.g. "GB", "req")'),
  percentage: z.number().optional().describe('Usage as a percentage of the limit'),
})

const providerStatusSchema = z.object({
  provider: z
    .enum(['vercel', 'railway', 'mongodb', 'stripe', 'resend', 'github'])
    .describe('Provider identifier'),
  displayName: z.string().describe('Human-readable provider name'),
  plan: z.string().describe('Current billing plan name'),
  monthlyCostEstimate: z.number().describe('Estimated monthly cost in USD'),
  usage: z.array(usageMetricSchema).describe('List of usage metrics for this provider'),
  status: z
    .enum(['healthy', 'warning', 'critical', 'unknown'])
    .describe('Aggregated health status'),
  statusMessage: z.string().optional().describe('Optional detail explaining the status'),
  lastSync: z.string().describe('ISO timestamp of the last successful sync'),
  dashboardUrl: z.string().describe('URL to the provider dashboard'),
  error: z.string().optional().describe('Error message when the status is "unknown"'),
})

const providerStatusListSchema = z.object({
  providers: z.array(providerStatusSchema).describe('List of provider statuses'),
  cacheTtlSeconds: z.number().describe('Remaining cache TTL in seconds'),
  generatedAt: z.string().describe('ISO timestamp when this response was generated'),
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
