/**
 * GET /api/upload/file/:fileId
 * Get uploaded file info
 */

import { logger } from '@ezstart/logger/server'
import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import path from 'path'
import fs from 'fs'

export const getFileInfoRegistry = new OpenAPIRegistry()
const router: any = Router()
export const getFileInfoRouter = createRouterWithDoc(
  getFileInfoRegistry,
  router,
  '/file/:fileId'
)

getFileInfoRouter.get(
  '/',
  (req, res) => {
    try {
      const { fileId } = req.params

      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'fileId is required',
          timestamp: new Date().toISOString(),
        })
      }

      const filePath = path.join('uploads', fileId)

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          timestamp: new Date().toISOString(),
        })
      }

      const stats = fs.statSync(filePath)

      res.json({
        success: true,
        data: {
          file_id: fileId,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('File info error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get file info',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Get uploaded file info',
    tags: ['Upload'],
  }
)

export default router
