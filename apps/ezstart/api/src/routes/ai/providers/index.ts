/**
 * GET /api/ai/providers
 * List enabled AI providers (public, no auth required)
 *
 * GET /api/ai/providers/status
 * Return current health/status of every registered provider (public). Used by
 * the admin dashboard + public status page to surface degraded / auto-disabled
 * providers.
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { providerRegistry } from '@ezstart/ai-sdk'

export const providersRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(providersRegistry, router, '/providers')

docRouter.get(
  '/',
  async (_req, res) => {
    try {
      const providers = providerRegistry.listEnabled()
      sendSuccess(res, { providers })
    } catch (error) {
      logger.error('[AI Providers] List error:', error)
      sendError(res, 'Failed to list providers')
    }
  },
  {
    summary: 'List enabled AI providers',
    tags: ['AI Providers'],
  }
)

docRouter.get(
  '/status',
  async (_req, res) => {
    try {
      const providers = providerRegistry.getStatus()
      sendSuccess(res, { providers })
    } catch (error) {
      logger.error('[AI Providers] Status error:', error)
      sendError(res, 'Failed to fetch provider status')
    }
  },
  {
    summary: 'Health status of all AI providers',
    tags: ['AI Providers'],
  }
)

export default router
