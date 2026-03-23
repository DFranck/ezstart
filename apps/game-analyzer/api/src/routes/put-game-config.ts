/**
 * PUT /api/config/:gameType/:layoutName — Save/update a layout
 */

import { Router } from '@ezstart/express-core'
import { getGameConfigModel } from '../models/game-config.js'

const router: any = Router()

router.put('/:gameType/:layoutName', async (req: any, res: any) => {
  try {
    const { bestPresets, zones, masks, roi, displayName } = req.body
    const { gameType, layoutName } = req.params

    if (!gameType || !layoutName) {
      return res.status(400).json({
        success: false,
        error: 'gameType and layoutName are required',
      })
    }

    const GameConfig = await getGameConfigModel()

    const config = await GameConfig.findOneAndUpdate(
      { gameType, layoutName },
      {
        gameType,
        layoutName,
        ...(displayName !== undefined && { displayName }),
        ...(bestPresets !== undefined && { bestPresets }),
        ...(zones !== undefined && { zones }),
        ...(masks !== undefined && { masks }),
        ...(roi !== undefined && { roi }),
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
