/**
 * Multer configuration for file uploads
 * Shared across all upload routes
 */

import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      audio: /\.(mp3|wav|m4a|ogg|flac)$/i,
      image: /\.(jpg|jpeg|png|webp|gif)$/i,
      document: /\.(pdf|doc|docx|xlsx|xls)$/i,
    }

    const uploadType = req.body.type || 'document'
    const pattern = allowedTypes[uploadType as keyof typeof allowedTypes]

    if (pattern && pattern.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error(`Invalid file type for ${uploadType}`))
    }
  }
})
