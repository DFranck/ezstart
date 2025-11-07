/**
 * POST /api/upload/image
 * Upload and analyze image
 */

import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import { readImage } from '../../services/gemini.service.js'
import { upload } from './multerConfig.js'

export const uploadImageRegistry = new OpenAPIRegistry()
const router: any = Router()
export const uploadImageRouter = createRouterWithDoc(
  uploadImageRegistry,
  router,
  '/image'
)

uploadImageRouter.post(
  '/',
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Image file is required',
          timestamp: new Date().toISOString(),
        })
      }

      const extractedData = await readImage(req.file.path)

      // Keep image file for reference (don't delete)
      // In production, you'd upload to cloud storage

      res.json({
        success: true,
        data: {
          type: 'image',
          extracted_data: extractedData,
          file_id: req.file.filename,
          original_name: req.file.originalname,
          file_path: req.file.path, // For temporary access
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Image upload error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process image',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Upload and analyze image',
    tags: ['Upload'],
  }
)

export default router
