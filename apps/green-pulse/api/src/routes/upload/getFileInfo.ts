/**
 * GET /api/upload/file/:fileId
 * Get uploaded file info
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
import path from 'path'
import fs from 'fs'

export const getFileInfoRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const getFileInfoRouter = createRouterWithDoc(getFileInfoRegistry, router, '/file/:fileId')

getFileInfoRouter.get(
  '/',
  (req, res) => {
    try {
      const { fileId } = req.params

      if (!fileId) {
        return sendError(res, 'fileId is required', 400)
      }

      const filePath = path.join('uploads', fileId)

      if (!fs.existsSync(filePath)) {
        return sendError(res, 'File not found', 404)
      }

      const stats = fs.statSync(filePath)

      sendSuccess(res, {
        file_id: fileId,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      })
    } catch (error) {
      logger.error('File info error:', error)
      sendError(res, 'Failed to get file info')
    }
  },
  {
    summary: 'Get uploaded file info',
    tags: ['Upload'],
  }
)

export default router
