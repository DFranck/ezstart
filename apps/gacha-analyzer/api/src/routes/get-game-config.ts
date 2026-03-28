/**
 * GET /api/config/:gameType — List all layouts for a game
 * GET /api/config/:gameType/:layoutName — Get a specific layout
 */

import { Router } from '@ezstart/express-core'
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
      return res.json({
        success: true,
        data: null,
      })
    }

    res.json({
      success: true,
      data: config,
    })
  } catch (error) {
    console.error('[get-game-config] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game config',
    })
  }
})

router.get('/:gameType', async (req: any, res: any) => {
  try {
    const GameConfig = await getGameConfigModel()

    const configs = await GameConfig.find({ gameType: req.params.gameType })
      .sort({ updatedAt: -1 })
      .lean()
      .exec()

    res.json({
      success: true,
      data: configs,
    })
  } catch (error) {
    console.error('[get-game-config] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game configs',
    })
  }
})

export default router
