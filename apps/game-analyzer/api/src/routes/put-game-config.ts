/**
 * PUT /api/config/:gameType — Save game config (presets, zones, masks)
 */

import { Router } from '@ezstart/express-core'
import { getGameConfigModel } from '../models/game-config.js'

const router: any = Router()

router.put('/:gameType', async (req: any, res: any) => {
  try {
    const { bestPresets, zones, masks } = req.body
    const { gameType } = req.params

    if (!gameType) {
      return res.status(400).json({
        success: false,
        error: 'gameType is required',
      })
    }

    const GameConfig = await getGameConfigModel()

    const config = await GameConfig.findOneAndUpdate(
      { gameType },
      {
        gameType,
        ...(bestPresets !== undefined && { bestPresets }),
        ...(zones !== undefined && { zones }),
        ...(masks !== undefined && { masks }),
        updatedAt: new Date(),
      },
      { upsert: true, new: true, lean: true }
    ).exec()

    res.json({
      success: true,
      data: config,
    })
  } catch (error) {
    console.error('[put-game-config] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to save game config',
    })
  }
})

export default router
