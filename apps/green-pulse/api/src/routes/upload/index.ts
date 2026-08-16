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

import { Router } from '@ezstart/api-core'
import { authMiddleware } from '../../middleware/auth.js'

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

// Consolidate all action routers — all upload routes require authentication.
// This parent is mounted at /api (no /upload prefix) — children own '/image',
// '/audio', '/document', '/file/:fileId' basePaths via createRouterWithDoc.
// We re-prefix them with '/upload' here so the final URL matches the original
// /api/upload/<resource> shape, and scope auth middleware to '/upload' to
// avoid leaking to sibling features.
const router: import('express').Router = Router()
router.use('/upload', authMiddleware)

router
  .use('/upload', uploadAudioRouter)
  .use('/upload', uploadImageRouter)
  .use('/upload', uploadDocumentRouter)
  .use('/upload', getFileInfoRouter)

export default router
