/**
 * DELETE /api/config/:gameType/:layoutName — Delete a layout
 */

import { Router } from '@ezstart/express-core'
import { getGameConfigModel } from '../models/game-config.js'

const router: any = Router()

router.delete('/:gameType/:layoutName', async (req: any, res: any) => {
  try {
    const { gameType, layoutName } = req.params

    if (!gameType || !layoutName) {
      return res.status(400).json({
        success: false,
        error: 'gameType and layoutName are required',
      })
    }

    const GameConfig = await getGameConfigModel()

    const config = await GameConfig.findOneAndDelete({ gameType, layoutName }).exec()

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Layout not found',
      })
    }

    res.json({
      success: true,
      data: { deleted: true },
    })
  } catch (error) {
    console.error('[delete-game-config] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete layout',
    })
  }
})

export default router
