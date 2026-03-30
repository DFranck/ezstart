/**
 * AI Providers Routes
 */

import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { listProviders } from '../actions/providers/list.js'

export const providersRegistry = new OpenAPIRegistry()

const router: import('express').Router = Router()
const docRouter = createRouterWithDoc(providersRegistry, router, '/providers')

// GET /api/providers - List available AI providers
docRouter.get('/', listProviders, {
  summary: 'List available AI providers',
  tags: ['Providers'],
  // responseSchema: TODO: Add proper schema for AI provider list
})

export default router
