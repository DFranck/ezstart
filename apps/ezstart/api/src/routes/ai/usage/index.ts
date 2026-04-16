/**
 * AI Usage Feature Router
 *
 * All routes require authentication.
 *
 * Routes:
 * - GET /api/ai/usage/stats -> get usage statistics
 */

import { Router } from '@ezstart/api-core'
import { authMiddleware } from '../../../middleware/auth.js'

import statsRouter, { usageStatsRegistry } from './stats.js'

export const usageRegistries = [usageStatsRegistry]

const router: import('express').Router = Router()

// This parent is mounted at /api/ai (no /usage prefix) — child owns '/usage'
// basePath via createRouterWithDoc. Scope middleware to '/usage' so it doesn't
// leak to sibling AI features.
router.use('/usage', authMiddleware)
router.use(statsRouter)

export default router
