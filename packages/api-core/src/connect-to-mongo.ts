/**
 * Monorepo-flavored MongoDB connector.
 *
 * Thin wrapper around `mongoose.connect()` that:
 * - Resolves `MONGO_URL` from the environment (defaults to localhost ONLY when
 *   the env var is unset — see fail-close semantics below).
 * - Detects Atlas vs localhost for observability.
 * - Logs via `@ezstart/logger`.
 * - Exits the process on unrecoverable failure — this is intentional for API
 *   boots (never run without DB), but makes the helper unsuitable for library
 *   consumers. Library consumers should implement `DbConnector` instead.
 *
 * ### Fail-close in production (Wave B Lot 1 — hacker H2)
 *
 * If `MONGO_URL` is set but the primary connection fails:
 * - `NODE_ENV === 'production'` → throw (no localhost fallback). Silently
 *   writing live customer data to a non-persistent localhost mongod is the
 *   worst-case data-loss / data-leak scenario.
 * - `NODE_ENV === 'test'` → throw. Tests must use `MongoMemoryServer` via the
 *   `@ezstart/test-utils` setup. A failed connection here signals a broken
 *   test harness.
 * - All other envs (dev) → keep the localhost fallback for DX, but log it
 *   LOUDLY (warn) so the operator notices and fixes the bad URL.
 *
 * @see {@link https://github.com/DFranck/ezstart/blob/master/.claude/rules/mongodb.md}
 * @see {@link https://github.com/DFranck/ezstart/blob/master/.claude/rules/data-protection.md}
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
    await logConnectionSuccess(connectionSource)
    isConnecting = false
    return mongoose
  } catch (err) {
    // Always reset the in-flight flag so a retry path (or test) can call again.
    isConnecting = false

    const errorMessage = err instanceof Error ? err.message : String(err)
    // 🔒 Never log `MONGO_URL` itself — it embeds credentials.
    logger.error('[MongoDB] Failed to connect:', errorMessage)

    const nodeEnv = process.env.NODE_ENV

    // 🔒 FAIL-CLOSE in production. Silently falling back to a local mongod
    // would let live customer data be written to a non-persistent DB if
    // someone happened to have one running on the Railway container.
    // See hacker report H2 (Wave B Lot 1).
    if (nodeEnv === 'production') {
      logger.error(
        '[MongoDB] PRODUCTION: refusing to fall back to localhost. ' +
          'Fix MONGO_URL and redeploy. Aborting boot.'
      )
      throw new Error('MongoDB connection failed in production — see logs. Aborting boot.')
    }

    // 🔒 FAIL-CLOSE in tests. Tests must use MongoMemoryServer; reaching this
    // branch means the test harness is misconfigured (data-protection.md).
    if (nodeEnv === 'test') {
      logger.error(
        '[MongoDB] TEST: refusing to fall back to localhost. ' +
          'Configure MongoMemoryServer (see @ezstart/test-utils). Aborting.'
      )
      throw err instanceof Error
        ? err
        : new Error(`MongoDB test connection failed: ${errorMessage}`)
    }

    // Dev only — keep the localhost fallback for DX, but warn LOUDLY so the
    // operator notices the bad URL instead of silently writing to localhost.
    logger.warn(
      `[MongoDB] DEV: Atlas/custom connection failed. Falling back to ` +
        `mongodb://localhost:27017/${dbName}. ` +
        `This fallback is ONLY active when NODE_ENV is neither 'production' ` +
        `nor 'test'. Fix MONGO_URL to silence this warning.`
    )

    const fallback = await tryFallbackConnection(dbName)
    if (fallback) return fallback

    logger.error('[MongoDB] Cannot start API without database connection')
    process.exit(1)
  }
}

async function logConnectionSuccess(source: string): Promise<void> {
  if (mongoose.connection.db) {
    await mongoose.connection.db.admin().ping()
    logger.info(
      `[MongoDB] Connected to '${mongoose.connection.name}' (${source}, read/write ready)`
    )
  } else {
    logger.info(`[MongoDB] Connected to '${mongoose.connection.name}' (${source})`)
  }
}

/**
 * DEV-ONLY fallback. The caller in `connectToMongo` already gated this on
 * `NODE_ENV !== 'production' && NODE_ENV !== 'test'` and emitted a warn.
 * Only attempts the fallback when the operator had set `MONGO_URL` (i.e. they
 * *thought* they were using Atlas / a custom cluster).
 */
async function tryFallbackConnection(dbName: string): Promise<typeof mongoose | null> {
  if (!process.env.MONGO_URL) return null

  logger.info(`[MongoDB] Trying fallback to localhost:27017/${dbName}...`)
  try {
    await mongoose.connect(`mongodb://localhost:27017/${dbName}`, DEFAULT_OPTIONS)
    registeredDbName = dbName
    await logConnectionSuccess('localhost')
    return mongoose
  } catch (fallbackErr) {
    logger.error(
      '[MongoDB] Fallback connection also failed:',
      fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
    )
    return null
  }
}
