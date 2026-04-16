/**
 * POST /api/upload/image
 * Upload and analyze image
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import { readImage } from '../../services/gemini.service.js'
import { upload } from './multerConfig.js'

export const uploadImageRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const uploadImageRouter = createRouterWithDoc(uploadImageRegistry, router, '/image')

uploadImageRouter.post(
  '/',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, 'Image file is required', 400)
      }

      const extractedData = await readImage(req.file.path)

      sendSuccess(res, {
        type: 'image',
        extracted_data: extractedData,
        file_id: req.file.filename,
        original_name: req.file.originalname,
        file_path: req.file.path,
      })
    } catch (error) {
      logger.error('Image upload error:', error)
      sendError(res, 'Failed to process image')
    }
  },
  {
    summary: 'Upload and analyze image',
    tags: ['Upload'],
  }
)

export default router
