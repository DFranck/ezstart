import { Router, OpenAPIRegistry } from '@ezstart/express-core'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { transcribeAudio, readImage } from '../services/gemini.service.js'
import { UploadTypeSchema } from '@green-pulse/types'

export const uploadRegistry = new OpenAPIRegistry()
const router: any = Router()

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

const upload = multer({
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

// POST /api/upload/audio - Upload and transcribe audio
router.post('/audio', upload.single('audio'), async (req, res) => {
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
})

// POST /api/upload/image - Upload and analyze image
router.post('/image', upload.single('image'), async (req, res) => {
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
})

// POST /api/upload/document - Upload document (basic)
router.post('/document', upload.single('document'), async (req, res) => {
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
    console.error('Document upload error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process document',
      timestamp: new Date().toISOString(),
    })
  }
})

// GET /api/upload/file/:fileId - Get uploaded file info
router.get('/file/:fileId', (req, res) => {
  try {
    const { fileId } = req.params
    const filePath = path.join('uploads', fileId)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        timestamp: new Date().toISOString(),
      })
    }

    const stats = fs.statSync(filePath)

    res.json({
      success: true,
      data: {
        file_id: fileId,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('File info error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get file info',
      timestamp: new Date().toISOString(),
    })
  }
})

export default router