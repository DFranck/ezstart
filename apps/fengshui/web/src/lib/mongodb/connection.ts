import mongoose from 'mongoose'
import { logger } from '@ezstart/logger'

/**
 * Lightweight MongoDB connection for Next.js API routes.
 * Singleton pattern — reuses connection across requests.
 * Avoids importing @ezstart/express-core (which pulls in Express).
 */
let isConnecting = false

export async function connectToMongo(): Promise<typeof mongoose> {
  // Already connected — return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  // Connection in progress — wait for it
  if (isConnecting) {
    await mongoose.connection.asPromise()
    return mongoose
  }

  isConnecting = true

  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/fengshui'

  mongoose.set('bufferCommands', false)
  mongoose.set('bufferTimeoutMS', 30000)

  const options = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    connectTimeoutMS: 30000,
  }

  try {
    await mongoose.connect(MONGO_URL, options)

    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping()
    }

    logger.info(`[MongoDB] Connected to '${mongoose.connection.name}'`)
    isConnecting = false
    return mongoose
  } catch (err) {
    logger.error(
      '[MongoDB] Failed to connect:',
      err instanceof Error ? err.message : String(err)
    )
    isConnecting = false
    throw err
  }
}
