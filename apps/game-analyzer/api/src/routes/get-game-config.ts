/**
 * GET /api/config/:gameType — Get game config (presets, zones, masks)
 */

import { Router } from '@ezstart/express-core'
import { getGameConfigModel } from '../models/game-config.js'

const router: any = Router()

router.get('/:gameType', async (req: any, res: any) => {
  try {
    const GameConfig = await getGameConfigModel()

    const config = await GameConfig.findOne({ gameType: req.params.gameType }).lean().exec()

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

export default router
