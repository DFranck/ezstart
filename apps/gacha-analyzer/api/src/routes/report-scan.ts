/**
 * POST /api/scans/:id/report — Create a new report on a scan
 * PATCH /api/scans/:id/report/:reportIndex — Update report status
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError, sendValidationError } from '@ezstart/express-core'
import { z } from 'zod'
import { getScanModel } from '../models/scan.js'

const VALID_CATEGORIES = ['wrong-ocr', 'wrong-advice', 'wrong-gem', 'wrong-efficiency', 'other'] as const
const VALID_STATUSES = ['open', 'in-progress', 'resolved'] as const

const createReportSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  description: z.string().min(1, 'description is required').transform((v) => v.trim()),
})

const updateReportSchema = z.object({
  status: z.enum(VALID_STATUSES),
  resolution: z.string().transform((v) => v.trim()).optional(),
}).refine(
  (data) => data.status !== 'resolved' || (data.resolution && data.resolution.length > 0),
  { message: 'resolution is required when status is resolved', path: ['resolution'] },
)

const reportIndexSchema = z.object({
  reportIndex: z.coerce.number().int().min(0),
})

const router: any = Router()

// POST /:id/report — Create a new report
router.post('/:id/report', async (req: any, res: any) => {
  try {
    const validation = createReportSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.errors,
      })
    }

    const { category, description } = validation.data

    const Scan = await getScanModel()
    const now = new Date()

    const scan = await Scan.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reports: {
            status: 'open',
            category,
            description,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
      { new: true }
    ).lean()

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
      })
    }

    res.status(201).json({
      success: true,
      data: { ...(scan as any), id: (scan as any)._id?.toString(), _id: undefined },
    })
  } catch (error) {
    logger.error('[report-scan] Error creating report:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create report',
    })
  }
})

// PATCH /:id/report/:reportIndex — Update report status
router.patch('/:id/report/:reportIndex', async (req: any, res: any) => {
  try {
    const indexValidation = reportIndexSchema.safeParse(req.params)
    if (!indexValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report index',
        details: indexValidation.error.errors,
      })
    }

    const bodyValidation = updateReportSchema.safeParse(req.body)
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: bodyValidation.error.errors,
      })
    }

    const { reportIndex } = indexValidation.data
    const { status, resolution } = bodyValidation.data

    const Scan = await getScanModel()

    const updateFields: Record<string, any> = {
      [`reports.${reportIndex}.status`]: status,
      [`reports.${reportIndex}.updatedAt`]: new Date(),
    }

    if (resolution) {
      updateFields[`reports.${reportIndex}.resolution`] = resolution
    }

    const scan = await Scan.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).lean()

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
      })
    }

    res.json({
      success: true,
      data: { ...(scan as any), id: (scan as any)._id?.toString(), _id: undefined },
    })
  } catch (error) {
    logger.error('[report-scan] Error updating report:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update report',
    })
  }
})

export default router
