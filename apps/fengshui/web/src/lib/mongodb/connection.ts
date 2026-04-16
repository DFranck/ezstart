import mongoose from 'mongoose'
import { logger } from '@ezstart/logger'
import { getMongoUrl } from '@ezstart/config/env-resolvers'

/**
 * Lightweight MongoDB connection for Next.js API routes.
 * Singleton pattern — reuses connection across requests.
 * Avoids importing @ezstart/api-core (which pulls in Express).
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

  // Resolve {app}/{env} from root MONGO_URL template; fall back to localhost
  // if root env is unavailable (e.g. editor preview).
  let MONGO_URL: string
  try {
    MONGO_URL = getMongoUrl('fengshui')
  } catch {
    MONGO_URL = 'mongodb://localhost:27017/fengshui-dev'
  }

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
    logger.error('[MongoDB] Failed to connect:', err instanceof Error ? err.message : String(err))
    isConnecting = false
    throw err
  }
}
