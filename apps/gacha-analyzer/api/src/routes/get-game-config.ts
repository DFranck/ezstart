/**
 * GET /api/config/:gameType — List all layouts for a game
 * GET /api/config/:gameType/:layoutName — Get a specific layout
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/express-core'
import { getGameConfigModel } from '../models/game-config.js'

const router: any = Router()

router.get('/:gameType/:layoutName', async (req: any, res: any) => {
  try {
    const GameConfig = await getGameConfigModel()

    const config = await GameConfig.findOne({
      gameType: req.params.gameType,
      layoutName: req.params.layoutName,
    }).lean().exec()

    if (!config) {
      return sendSuccess(res, null)
    }

    return sendSuccess(res, config)
  } catch (error) {
    logger.error('[get-game-config] Error:', error)
    return sendError(res, 'Failed to fetch game config')
  }
})

router.get('/:gameType', async (req: any, res: any) => {
  try {
    const GameConfig = await getGameConfigModel()

    const configs = await GameConfig.find({ gameType: req.params.gameType })
      .sort({ updatedAt: -1 })
      .lean()
      .exec()

    return sendSuccess(res, configs)
  } catch (error) {
    logger.error('[get-game-config] Error:', error)
    return sendError(res, 'Failed to fetch game configs')
  }
})

export default router
