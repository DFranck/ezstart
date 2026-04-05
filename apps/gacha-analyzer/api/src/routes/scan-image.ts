/**
 * POST /api/scan — Upload image + OCR scan
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import type { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { upload } from '../middleware/upload.js'
import { scanImage } from '../services/scan-service.js'
import type { GameType } from '@gacha-analyzer/types'

const router: ExpressRouter = Router()

const scanBodySchema = z.object({
  gameType: z.enum(['summoners-war', 'nikke']),
  profile: z.enum(['early', 'mid', 'late']).optional().default('mid'),
  benchMode: z
    .preprocess(v => v === 'true' || v === true, z.boolean())
    .optional()
    .default(false),
  presets: z.preprocess(
    v => (typeof v === 'string' ? JSON.parse(v) : v),
    z.array(z.string()).optional()
  ),
})

// POST /scan — Upload an image (+ optional alt/full images) and run OCR
router.post(
  '/',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imageAlt', maxCount: 1 },
    { name: 'imageFull', maxCount: 1 },
    { name: 'zoneSetSlot', maxCount: 1 },
    { name: 'zoneMainStat', maxCount: 1 },
    { name: 'zoneQuality', maxCount: 1 },
    { name: 'zoneInnate', maxCount: 1 },
    { name: 'zoneSub1', maxCount: 1 },
    { name: 'zoneSub2', maxCount: 1 },
    { name: 'zoneSub3', maxCount: 1 },
    { name: 'zoneSub4', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined
      const imageFile = files?.image?.[0]
      if (!imageFile) {
        return sendError(res, 'No image file provided. Use field name "image".', 400)
      }

      const validation = scanBodySchema.safeParse(req.body)
      if (!validation.success) {
        return sendValidationError(res, 'Invalid request body', validation.error.errors, 400)
      }

      const { gameType, profile, benchMode, presets } = validation.data
      const thumbnail: string | undefined = req.body.thumbnail || undefined
      const imageAltFile = files?.imageAlt?.[0]
      const imageFullFile = files?.imageFull?.[0]

      // Zone-based images (multi-zone ROI — 8 individual zones)
      const zoneBuffers: Record<string, Buffer> | undefined = (() => {
        const zoneNames = [
          'SetSlot',
          'MainStat',
          'Quality',
          'Innate',
          'Sub1',
          'Sub2',
          'Sub3',
          'Sub4',
        ] as const
        const zones: Record<string, Buffer> = {}
        let hasAny = false
        for (const name of zoneNames) {
          const file = files?.[`zone${name}`]?.[0]
          if (file) {
            zones[name.charAt(0).toLowerCase() + name.slice(1)] = file.buffer
            hasAny = true
          }
        }
        return hasAny ? zones : undefined
      })()

      const { scanId, result } = await scanImage(
        imageFile.buffer,
        gameType as GameType,
        profile,
        imageAltFile?.buffer,
        imageFullFile?.buffer,
        benchMode,
        presets,
        zoneBuffers,
        thumbnail
      )

      res.status(201)
      return sendSuccess(res, {
        id: scanId,
        gameType,
        status: result.success ? 'completed' : 'failed',
        result,
      })
    } catch (error) {
      logger.error('[scan-image] Error:', error)
      return sendError(res, error instanceof Error ? error.message : 'Failed to process scan')
    }
  }
)

export default router
