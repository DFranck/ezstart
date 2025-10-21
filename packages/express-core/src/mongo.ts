import mongoose from 'mongoose'
import { logger } from '@ezstart/logger'

/**
 * Flag to track if connection is being established
 * Prevents multiple simultaneous connection attempts
 */
let isConnecting = false

/**
 * Single source of truth for MongoDB connection across the entire monorepo.
 *
 * All packages MUST use this function instead of importing mongoose directly.
 * This ensures a single shared connection instance across all packages.
 *
 * Features:
 * - Connection pooling (single instance)
 * - Automatic retry logic
 * - Fail-fast with bufferCommands disabled
 * - Reasonable timeouts for production
 *
 * Usage:
 * ```typescript
 * import { getMongo } from '@ezstart/express-core/mongo'
 *
 * const mongoose = await getMongo()
 * const MyModel = mongoose.model('MyModel', schema)
 * ```
 *
 * @returns Promise<Mongoose> - The shared mongoose instance
 * @throws Error if MONGO_URL is not defined
 */
export async function getMongo(): Promise<typeof mongoose> {
  // Already connected - return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  // Connection in progress - wait for it to complete
  if (!isConnecting) {
    isConnecting = true

    const mongoUrl = process.env.MONGO_URL
    if (!mongoUrl) {
      throw new Error('MONGO_URL environment variable is not defined')
    }

    // Detect connection source
    const connectionSource = mongoUrl.includes('mongodb.net') || mongoUrl.includes('cloud.mongodb.com')
      ? 'Atlas'
      : 'localhost'

    // Disable buffering for fail-fast behavior
    // If connection fails, we want immediate errors instead of buffering operations
    mongoose.set('bufferCommands', false)
    mongoose.set('bufferTimeoutMS', 30000) // 30s instead of 10s

    logger.info({ source: connectionSource }, '🔌 [MongoDB] Connecting to database')

    try {
      await mongoose.connect(mongoUrl, {
        // Server selection timeout: How long to wait to find a suitable server
        serverSelectionTimeoutMS: 30000,
        // Connection timeout: How long to wait to establish initial connection
        connectTimeoutMS: 30000,
        // Socket timeout: How long to wait for socket operations
        socketTimeoutMS: 45000,
        // Connection pool
        maxPoolSize: 10,
        minPoolSize: 2,
      })

      // Test the connection with a ping
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping()
        logger.info({ database: mongoose.connection.name }, '✅ [MongoDB] Connected (read/write ready)')
      } else {
        logger.info({ database: mongoose.connection.name }, '✅ [MongoDB] Connected')
      }
    } catch (error) {
      isConnecting = false
      logger.error({ error }, '[MongoDB] ❌ Connection failed')
      throw error
    }
  }

  // Wait for connection to be fully established (readyState === 1)
  await mongoose.connection.asPromise()

  return mongoose
}

/**
 * Get current MongoDB connection state for diagnostics
 *
 * States:
 * - 0 = disconnected
 * - 1 = connected
 * - 2 = connecting
 * - 3 = disconnecting
 *
 * @returns number - Current connection state
 */
export function getConnectionState(): number {
  return mongoose.connection.readyState
}

/**
 * Disconnect from MongoDB (useful for cleanup in tests)
 */
export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    logger.info('[MongoDB] Disconnecting...')
    await mongoose.disconnect()
    isConnecting = false
    logger.info('[MongoDB] ✅ Disconnected')
  }
}
