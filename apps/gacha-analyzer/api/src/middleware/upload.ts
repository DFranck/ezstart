import multer from 'multer'
import type { Request } from 'express'

const ALLOWED_MIMETYPES = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/webp',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const storage = multer.memoryStorage()

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Accepted: png, jpg, jpeg, webp`))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
})
