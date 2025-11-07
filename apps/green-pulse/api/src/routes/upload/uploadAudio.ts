/**
 * POST /api/upload/audio
 * Upload and transcribe audio
 */

import { Router, OpenAPIRegistry, createRouterWithDoc } from '@ezstart/express-core'
import fs from 'fs'
import { transcribeAudio } from '../../services/gemini.service.js'
import { upload } from './multerConfig.js'

export const uploadAudioRegistry = new OpenAPIRegistry()
const router: any = Router()
export const uploadAudioRouter = createRouterWithDoc(
  uploadAudioRegistry,
  router,
  '/audio'
)

uploadAudioRouter.post(
  '/',
  upload.single('audio'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Audio file is required',
          timestamp: new Date().toISOString(),
        })
      }

      const text = await transcribeAudio(req.file.path)

      // Clean up uploaded file
      fs.unlinkSync(req.file.path)

      res.json({
        success: true,
        data: {
          type: 'audio',
          text,
          file_id: req.file.filename,
          original_name: req.file.originalname,
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      // Clean up file if it exists
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path)
        } catch {}
      }

      console.error('Audio upload error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process audio file',
        timestamp: new Date().toISOString(),
      })
    }
  },
  {
    summary: 'Upload and transcribe audio',
    tags: ['Upload'],
  }
)

export default router
