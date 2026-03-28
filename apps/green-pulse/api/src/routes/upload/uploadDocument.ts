/**
 * POST /api/upload/document
 * Upload document (basic)
 */

import { logger } from '@ezstart/logger/server'
import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import path from 'path'
import { upload } from './multerConfig.js'

export const uploadDocumentRegistry = new OpenAPIRegistry()
const router: any = Router()
export const uploadDocumentRouter = createRouterWithDoc(
  uploadDocumentRegistry,
  router,
  '/document'
)

uploadDocumentRouter.post(
  '/',
  upload.single('document'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Document file is required',
          timestamp: new Date().toISOString(),
        })
      }

      // For now, just store the document
      // In a full implementation, you'd extract text using OCR or PDF parsing

      res.json({
        success: true,
        data: {
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
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('Document upload error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process document',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Upload document',
    tags: ['Upload'],
  }
)

export default router
