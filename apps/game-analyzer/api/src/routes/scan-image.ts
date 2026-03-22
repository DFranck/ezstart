/**
 * POST /api/scan — Upload image + OCR scan
 */

import { Router } from '@ezstart/express-core'
import { z } from 'zod'
import { upload } from '../middleware/upload.js'
import { scanImage } from '../services/scan-service.js'
import type { GameType } from '@game-analyzer/types'

const router: any = Router()

const scanBodySchema = z.object({
  gameType: z.enum(['summoners-war', 'nikke']),
})

// POST /scan — Upload an image and run OCR
router.post('/', upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Use field name "image".',
      })
    }

    const validation = scanBodySchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.errors,
      })
    }

    const { gameType } = validation.data

    const { scanId, result } = await scanImage(req.file.buffer, gameType as GameType)

    res.status(201).json({
      success: true,
      data: {
        id: scanId,
        gameType,
        status: result.success ? 'completed' : 'failed',
        result,
      },
    })
  } catch (error) {
    console.error('[scan-image] Error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process scan',
    })
  }
})

export default router
