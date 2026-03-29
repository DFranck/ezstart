/**
 * GET /api/config/:gameType — List all layouts for a game
 * GET /api/config/:gameType/:layoutName — Get a specific layout
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError, findOne, findMany } from '@ezstart/express-core'
import { getGameConfigModel } from '../models/game-config.js'

const router: any = Router()

router.get('/:gameType/:layoutName', async (req: any, res: any) => {
  try {
    const GameConfig = await getGameConfigModel()

    const config = await findOne(GameConfig, {
      gameType: req.params.gameType,
      layoutName: req.params.layoutName,
    })
      .lean()
      .exec()

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
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const filter = { gameType: req.params.gameType }

    const [configs, total] = await Promise.all([
      findMany(GameConfig, filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean().exec(),
      GameConfig.countDocuments(filter),
    ])

    return sendSuccess(res, configs, { total, limit, offset })
  } catch (error) {
    logger.error('[get-game-config] Error:', error)
    return sendError(res, 'Failed to fetch game configs')
  }
})

export default router
