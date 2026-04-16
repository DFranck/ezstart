/**
 * Monorepo-flavored MongoDB connector.
 *
 * Thin wrapper around `mongoose.connect()` that:
 * - Resolves `MONGO_URL` from the environment (falls back to localhost).
 * - Detects Atlas vs localhost for observability.
 * - Logs via `@ezstart/logger`.
 * - Exits the process on unrecoverable failure — this is intentional for API
 *   boots (never run without DB), but makes the helper unsuitable for library
 *   consumers. Library consumers should implement `DbConnector` instead.
 *
 * @see {@link https://github.com/DFranck/ezstart/blob/master/.claude/rules/mongodb.md}
 */

import mongoose from 'mongoose'
import { logger } from '@ezstart/logger/server'

let isConnecting = false
let registeredDbName: string | null = null

const DEFAULT_OPTIONS = {
  serverSelectionTimeoutMS: 30_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
  minPoolSize: 2,
  connectTimeoutMS: 30_000,
}

/**
 * Connect the shared Mongoose instance to MongoDB.
 *
 * Singleton: subsequent calls with the same `dbName` return the existing
 * connection; calls with a different `dbName` while already connected are
 * logged as a warning and ignored (1 DB per process — see
 * `.claude/rules/mongodb.md`).
 *
 * @example
 * ```ts
 * import { connectToMongo } from '@ezstart/api-core'
 *
 * await connectToMongo('myapp')
 * ```
 */
export async function connectToMongo(dbName: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    if (registeredDbName && registeredDbName !== dbName) {
      logger.warn(
        `[MongoDB] connectToMongo('${dbName}') ignored — already connected as '${registeredDbName}'. ` +
          `Multi-DB in the same process is not supported; use a single DB per API.`
      )
    }
    return mongoose
  }

  if (isConnecting) {
    await mongoose.connection.asPromise()
    return mongoose
  }

  isConnecting = true

  const MONGO_URL = process.env.MONGO_URL ?? `mongodb://localhost:27017/${dbName}`
  const connectionSource = process.env.MONGO_URL
    ? MONGO_URL.includes('mongodb.net') || MONGO_URL.includes('cloud.mongodb.com')
      ? 'Atlas'
      : 'custom'
    : 'localhost'

  mongoose.set('bufferCommands', false)
  mongoose.set('bufferTimeoutMS', 30_000)

  try {
    await mongoose.connect(MONGO_URL, DEFAULT_OPTIONS)
    registeredDbName = dbName

    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping()
      logger.info(
        `[MongoDB] Connected to '${mongoose.connection.name}' (${connectionSource}, read/write ready)`
      )
    } else {
      logger.info(`[MongoDB] Connected to '${mongoose.connection.name}' (${connectionSource})`)
    }

    isConnecting = false
    return mongoose
  } catch (err) {
    logger.error(`[MongoDB] Failed to connect:`, err instanceof Error ? err.message : String(err))

    if (process.env.MONGO_URL) {
      logger.info(`[MongoDB] Trying fallback to localhost:27017/${dbName}...`)
      try {
        await mongoose.connect(`mongodb://localhost:27017/${dbName}`, DEFAULT_OPTIONS)
        registeredDbName = dbName
        if (mongoose.connection.db) {
          await mongoose.connection.db.admin().ping()
          logger.info(
            `[MongoDB] Connected to '${mongoose.connection.name}' (localhost, read/write ready)`
          )
        }
        isConnecting = false
        return mongoose
      } catch (fallbackErr) {
        logger.error(
          '[MongoDB] Fallback connection also failed:',
          fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        )
      }
    }

    logger.error('[MongoDB] Cannot start API without database connection')
    isConnecting = false
    process.exit(1)
  }
}
