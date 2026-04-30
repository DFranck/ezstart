import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Document, type Model } from 'mongoose'

/**
 * ErrorLog severity level. `'fatal'` is reserved for unrecoverable failures
 * (e.g. process about to crash); the global error handler emits `'error'`.
 */
export type ErrorLogLevel = 'error' | 'warn' | 'fatal'

export const ERROR_LOG_LEVELS: readonly ErrorLogLevel[] = ['error', 'warn', 'fatal'] as const

/**
 * Default retention window — auto-deleted by the MongoDB TTL index. Override
 * via the `ERROR_LOG_TTL_DAYS` environment variable (positive integer).
 */
export const ERROR_LOG_DEFAULT_TTL_DAYS = 30

function resolveTtlDays(): number {
  const raw = process.env.ERROR_LOG_TTL_DAYS
  if (!raw) return ERROR_LOG_DEFAULT_TTL_DAYS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return ERROR_LOG_DEFAULT_TTL_DAYS
  return parsed
}

/**
 * Persisted unhandled error captured by the global API error handler.
 * Stored locally so the admin dashboard can browse/filter without depending
 * on a third-party tracker (Sentry-free stopgap pattern).
 */
export interface ErrorLogDocument extends Document {
  /** When the error happened (server time, indexed). */
  timestamp: Date
  /** Severity (`'error'` for unhandled exceptions, `'warn'` for non-fatal). */
  level: ErrorLogLevel
  /** Truncated `err.message` (max 2 000 chars) — required. */
  message: string
  /** Truncated `err.stack` (max 8 000 chars). */
  stack?: string
  /** `err.name` (e.g. `'TypeError'`, `'ZodError'`). */
  errorName?: string
  /** `req.originalUrl` (path + query) at the time of the error. */
  url?: string
  /** HTTP method (`'GET'`, `'POST'`, …). */
  method?: string
  /** HTTP response status (when known — populated post-handler). */
  statusCode?: number
  /** `req.user.userId` if the request was authenticated. */
  userId?: string
  /** `req.ip` (best-effort, behind reverse proxy). */
  ip?: string
  /** Truncated User-Agent header (max 500 chars). */
  userAgent?: string
  /** Git SHA from the deploy environment, when available. */
  releaseSha?: string
  /** `DEPLOY_ENV` or `NODE_ENV` snapshot at error time. */
  env?: string
  /** Free-form caller-supplied context (test mode, app slug, …). */
  context?: Record<string, unknown>
}

const errorLogSchema = new Schema<ErrorLogDocument>(
  {
    timestamp: { type: Date, default: () => new Date(), index: true },
    level: {
      type: String,
      enum: ERROR_LOG_LEVELS,
      default: 'error',
      index: true,
      required: true,
    },
    message: { type: String, required: true },
    stack: { type: String },
    errorName: { type: String, index: true },
    url: { type: String, index: true },
    method: { type: String },
    statusCode: { type: Number, index: true },
    userId: { type: String, index: true },
    ip: { type: String },
    userAgent: { type: String },
    releaseSha: { type: String },
    env: { type: String, index: true },
    context: { type: Schema.Types.Mixed },
  },
  {
    timestamps: false,
    collection: 'error_logs',
    bufferCommands: false,
  }
)

// Compound index — most frequent admin query: recent errors filtered by
// statusCode (5xx surfaces incidents, 4xx surfaces validation noise).
errorLogSchema.index({ timestamp: -1, statusCode: 1 })

// MongoDB TTL — auto-delete after `ERROR_LOG_TTL_DAYS` days. Configurable
// via env so high-traffic deployments can shrink the retention window.
const ttlSeconds = resolveTtlDays() * 24 * 60 * 60
errorLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: ttlSeconds })

/**
 * Factory function returning the `ErrorLog` model attached to the shared
 * Mongo connection. MUST be invoked AFTER `connectToMongo()` succeeds — the
 * helper itself calls it for safety so callers don't need to await Mongo
 * separately.
 */
export async function getErrorLogModel(): Promise<Model<ErrorLogDocument>> {
  const mongoose = await connectToMongo('ezauth')
  return mongoose.models.ErrorLog || mongoose.model<ErrorLogDocument>('ErrorLog', errorLogSchema)
}
