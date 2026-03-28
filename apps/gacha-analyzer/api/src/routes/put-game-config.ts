/**
 * PUT /api/config/:gameType/:layoutName — Save/update a layout
 */

import { Router } from '@ezstart/express-core'
import { z } from 'zod'
import { getGameConfigModel } from '../models/game-config.js'

const router: any = Router()

const paramsSchema = z.object({
  gameType: z.enum(['summoners-war', 'nikke']),
  layoutName: z.string().min(1),
})

const bodySchema = z.object({
  displayName: z.string().optional(),
  bestPresets: z.array(z.string()).optional(),
  zones: z.record(z.any()).optional(),
  masks: z.record(z.any()).optional(),
  roi: z.record(z.any()).optional(),
})

router.put('/:gameType/:layoutName', async (req: any, res: any) => {
  try {
    const paramsValidation = paramsSchema.safeParse(req.params)
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid route parameters',
        details: paramsValidation.error.errors,
      })
    }

    const bodyValidation = bodySchema.safeParse(req.body)
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: bodyValidation.error.errors,
      })
    }

    const { gameType, layoutName } = paramsValidation.data
    const { bestPresets, zones, masks, roi, displayName } = bodyValidation.data

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
