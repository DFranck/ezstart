/**
 * GET /api/ai/providers
 * List enabled AI providers (public, no auth required)
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
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

export default router
