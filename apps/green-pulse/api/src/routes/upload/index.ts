/**
 * Upload Feature Router
 *
 * Consolidates all upload-related actions into a single router.
 * Each action is defined in its own file following the action-based routing pattern.
 *
 * Routes:
 * - POST /api/upload/audio        -> uploadAudio (transcribe audio)
 * - POST /api/upload/image        -> uploadImage (analyze image)
 * - POST /api/upload/document     -> uploadDocument (basic upload)
 * - GET  /api/upload/file/:fileId -> getFileInfo (file metadata)
 */

import { Router } from '@ezstart/express-core'

// Import individual action routers
import uploadAudioRouter, { uploadAudioRegistry } from './uploadAudio.js'
import uploadImageRouter, { uploadImageRegistry } from './uploadImage.js'
import uploadDocumentRouter, { uploadDocumentRegistry } from './uploadDocument.js'
import getFileInfoRouter, { getFileInfoRegistry } from './getFileInfo.js'

// Export all registries as an array for OpenAPI documentation
export const uploadRegistries = [
  uploadAudioRegistry,
  uploadImageRegistry,
  uploadDocumentRegistry,
  getFileInfoRegistry,
]

// Consolidate all action routers
const router: import('express').Router = Router()

router
  .use('/audio', uploadAudioRouter) // POST /audio
  .use('/image', uploadImageRouter) // POST /image
  .use('/document', uploadDocumentRouter) // POST /document
  .use('/file/:fileId', getFileInfoRouter) // GET /file/:fileId

export default router
