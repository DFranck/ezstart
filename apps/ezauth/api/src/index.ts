import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 9999

// Security middleware
app.use(helmet())

// CORS configuration - Allow all origins for development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://ezstart.com', 'https://auth.ezstart.com', 'https://ez-billing.ezstart.com']
    : true, // Allow all origins in development
  credentials: true
}))

// Parse JSON
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ezauth-api',
    timestamp: new Date().toISOString()
  })
})

// API routes
app.use('/api/auth', authRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  })
})

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  })
})

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017/ezauth'
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    process.exit(1)
  }
}

// Start server
const startServer = async () => {
  await connectDB()
  
  app.listen(Number(PORT), '127.0.0.1', () => {
    console.log(`🚀 EZAuth API running on port ${PORT}`)
    console.log(`📱 Health check: http://localhost:${PORT}/health`)
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`)
  })
}

startServer().catch(console.error)