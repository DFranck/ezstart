/**
 * GET /api/providers - List available AI providers
 */

import { logger } from '@ezstart/logger/server'
import { Request, Response } from 'express'
import { sendSuccess, sendError } from '@ezstart/express-core'
import { providerRegistry } from '@ezstart/ai-sdk'

export async function listProviders(req: Request, res: Response) {
  try {
    const providers = providerRegistry.listEnabled()
    return sendSuccess(res, providers)
  } catch (error) {
    logger.error('[Providers] Error listing providers:', error)
    return sendError(res, 'Failed to list AI providers')
  }
}
