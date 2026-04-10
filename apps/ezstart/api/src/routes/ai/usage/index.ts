/**
 * AI Usage Feature Router
 *
 * All routes require authentication.
 *
 * Routes:
 * - GET /api/ai/usage/stats -> get usage statistics
 */

import { Router } from '@ezstart/express-core'
import { authMiddleware } from '../../../middleware/auth.js'

import statsRouter, { usageStatsRegistry } from './stats.js'

export const usageRegistries = [usageStatsRegistry]

const router: import('express').Router = Router()

// All usage routes require auth
router.use(authMiddleware)
router.use(statsRouter)

export default router
