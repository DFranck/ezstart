/**
 * POST /api/scans/:id/report — Create a new report on a scan
 * PATCH /api/scans/:id/report/:reportIndex — Update report status
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  sendSuccess,
  sendError,
  sendValidationError,
  findByIdAndUpdate,
} from '@ezstart/express-core'
import { z } from 'zod'
import { getScanModel } from '../models/scan.js'

const VALID_CATEGORIES = [
  'wrong-ocr',
  'wrong-advice',
  'wrong-gem',
  'wrong-efficiency',
  'other',
] as const
const VALID_STATUSES = ['open', 'in-progress', 'resolved'] as const

const createReportSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  description: z
    .string()
    .min(1, 'description is required')
    .transform(v => v.trim()),
})

const updateReportSchema = z
  .object({
    status: z.enum(VALID_STATUSES),
    resolution: z
      .string()
      .transform(v => v.trim())
      .optional(),
  })
  .refine(data => data.status !== 'resolved' || (data.resolution && data.resolution.length > 0), {
    message: 'resolution is required when status is resolved',
    path: ['resolution'],
  })

const reportIndexSchema = z.object({
  reportIndex: z.coerce.number().int().min(0),
})

const router = Router()

// POST /:id/report — Create a new report
router.post('/:id/report', async (req, res) => {
  try {
    const validation = createReportSchema.safeParse(req.body)
    if (!validation.success) {
      return sendValidationError(res, 'Invalid request body', validation.error.errors, 400)
    }

    const { category, description } = validation.data

    const Scan = await getScanModel()
    const now = new Date()

    const scan = await findByIdAndUpdate(
      Scan,
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
      return sendError(res, 'Scan not found', 404)
    }

    res.status(201)
    return sendSuccess(res, {
      ...scan,
      id: (scan as Record<string, any>)._id?.toString(),
      _id: undefined,
    })
  } catch (error) {
    logger.error('[report-scan] Error creating report:', error)
    return sendError(res, 'Failed to create report')
  }
})

// PATCH /:id/report/:reportIndex — Update report status
router.patch('/:id/report/:reportIndex', async (req, res) => {
  try {
    const indexValidation = reportIndexSchema.safeParse(req.params)
    if (!indexValidation.success) {
      return sendValidationError(res, 'Invalid report index', indexValidation.error.errors, 400)
    }

    const bodyValidation = updateReportSchema.safeParse(req.body)
    if (!bodyValidation.success) {
      return sendValidationError(res, 'Invalid request body', bodyValidation.error.errors, 400)
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

    const scan = await findByIdAndUpdate(
      Scan,
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).lean()

    if (!scan) {
      return sendError(res, 'Scan not found', 404)
    }

    return sendSuccess(res, {
      ...scan,
      id: (scan as Record<string, any>)._id?.toString(),
      _id: undefined,
    })
  } catch (error) {
    logger.error('[report-scan] Error updating report:', error)
    return sendError(res, 'Failed to update report')
  }
})

export default router
