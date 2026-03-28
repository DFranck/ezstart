/**
 * POST /api/scans/:id/report — Create a new report on a scan
 * PATCH /api/scans/:id/report/:reportIndex — Update report status
 */

import { Router } from '@ezstart/express-core'
import { getScanModel } from '../models/scan.js'

const VALID_CATEGORIES = ['wrong-ocr', 'wrong-advice', 'wrong-gem', 'wrong-efficiency', 'other']
const VALID_STATUSES = ['open', 'in-progress', 'resolved']

const router: any = Router()

// POST /:id/report — Create a new report
router.post('/:id/report', async (req: any, res: any) => {
  try {
    const { category, description } = req.body

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      })
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'description is required',
      })
    }

    const Scan = await getScanModel()
    const now = new Date()

    const scan = await Scan.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reports: {
            status: 'open',
            category,
            description: description.trim(),
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
    console.error('[report-scan] Error creating report:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create report',
    })
  }
})

// PATCH /:id/report/:reportIndex — Update report status
router.patch('/:id/report/:reportIndex', async (req: any, res: any) => {
  try {
    const { status, resolution } = req.body
    const reportIndex = parseInt(req.params.reportIndex, 10)

    if (isNaN(reportIndex) || reportIndex < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report index',
      })
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      })
    }

    if (status === 'resolved' && (!resolution || typeof resolution !== 'string' || !resolution.trim())) {
      return res.status(400).json({
        success: false,
        error: 'resolution is required when status is resolved',
      })
    }

    const Scan = await getScanModel()

    const updateFields: Record<string, any> = {
      [`reports.${reportIndex}.status`]: status,
      [`reports.${reportIndex}.updatedAt`]: new Date(),
    }

    if (resolution) {
      updateFields[`reports.${reportIndex}.resolution`] = resolution.trim()
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
    console.error('[report-scan] Error updating report:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update report',
    })
  }
})

export default router
