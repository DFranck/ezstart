/**
 * POST /api/upload/document
 * Upload document (basic)
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import path from 'path'
import { upload } from './multerConfig.js'

export const uploadDocumentRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const uploadDocumentRouter = createRouterWithDoc(uploadDocumentRegistry, router, '/document')

uploadDocumentRouter.post(
  '/',
  upload.single('document'),
  async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, 'Document file is required', 400)
      }

      sendSuccess(res, {
        type: 'document',
        text: `Document uploaded: ${req.file.originalname}`,
        file_id: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
        extracted_data: {
          file_type: path.extname(req.file.originalname),
          size_bytes: req.file.size,
          upload_time: new Date().toISOString(),
        },
      })
    } catch (error) {
      logger.error('Document upload error:', error)
      sendError(res, 'Failed to process document')
    }
  },
  {
    summary: 'Upload document',
    tags: ['Upload'],
  }
)

export default router
