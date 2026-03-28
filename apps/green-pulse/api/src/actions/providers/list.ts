/**
 * GET /api/providers - List available AI providers
 */

import { logger } from '@ezstart/logger/server'
import { Request, Response } from 'express'
import { providerRegistry } from '@ezstart/ai-sdk'

export async function listProviders(req: Request, res: Response) {
  try {
    const providers = providerRegistry.listEnabled()

    res.json({
      success: true,
      data: providers,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[Providers] Error listing providers:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list AI providers',
      timestamp: new Date().toISOString(),
    })
  }
}
