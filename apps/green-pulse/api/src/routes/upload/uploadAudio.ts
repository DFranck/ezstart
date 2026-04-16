/**
 * POST /api/upload/audio
 * Upload and transcribe audio
 */

import { logger } from '@ezstart/logger/server'
import {
  Router,
  OpenAPIRegistry,
  createRouterWithDoc,
  sendSuccess,
  sendError,
} from '@ezstart/api-core'
import fs from 'fs'
import { transcribeAudio } from '../../services/gemini.service.js'
import { upload } from './multerConfig.js'

export const uploadAudioRegistry = new OpenAPIRegistry()
const router: import('express').Router = Router()
export const uploadAudioRouter = createRouterWithDoc(uploadAudioRegistry, router, '/audio')

uploadAudioRouter.post(
  '/',
  upload.single('audio'),
  async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, 'Audio file is required', 400)
      }

      const text = await transcribeAudio(req.file.path)

      // Clean up uploaded file
      fs.unlinkSync(req.file.path)

      sendSuccess(res, {
        type: 'audio',
        text,
        file_id: req.file.filename,
        original_name: req.file.originalname,
      })
    } catch (error) {
      // Clean up file if it exists
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path)
        } catch {}
      }

      logger.error('Audio upload error:', error)
      sendError(res, 'Failed to process audio file')
    }
  },
  {
    summary: 'Upload and transcribe audio',
    tags: ['Upload'],
  }
)

export default router
