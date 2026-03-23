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
  profile: z.enum(['early', 'mid', 'late']).optional().default('mid'),
})

// POST /scan — Upload an image (+ optional alt image) and run OCR
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'imageAlt', maxCount: 1 }]), async (req: any, res: any) => {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const imageFile = files?.image?.[0]
    if (!imageFile) {
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

    const { gameType, profile } = validation.data
    const imageAltFile = files?.imageAlt?.[0]

    const { scanId, result } = await scanImage(imageFile.buffer, gameType as GameType, profile, imageAltFile?.buffer)

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
