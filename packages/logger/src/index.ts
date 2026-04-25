/**
 * Browser-safe logger (no Pino)
 *
 * Use this in web apps (Next.js client components)
 * For server-side logging with Pino, use '@ezstart/logger/server'
 *
 * Filtering:
 * - debug/info: Only log when NODE_ENV !== 'production'
 * - warn/error: Always log
 *
 * @example
 * ```typescript
 * // In web apps (client components)
 * import { logger } from '@ezstart/logger'
 * logger.info('User clicked button', { buttonId: '123' })
 *
 * // In APIs (server-side)
 * import { logger } from '@ezstart/logger/server'
 * logger.error('Database error', { error, userId })
 * ```
 */

// Safe check for browser environments where `process` may not exist
const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true

export const logger = {
  info: (msgOrObj: string | object, dataOrMsg?: unknown) => {
    if (!isDev) return
    if (typeof msgOrObj === 'string') {
      console.log(`[INFO] ${msgOrObj}`, dataOrMsg || '')
    } else {
      console.log(`[INFO] ${dataOrMsg}`, msgOrObj)
    }
  },
  warn: (msgOrObj: string | object, dataOrMsg?: unknown) => {
    if (typeof msgOrObj === 'string') {
      console.warn(`[WARN] ${msgOrObj}`, dataOrMsg || '')
    } else {
      console.warn(`[WARN] ${dataOrMsg}`, msgOrObj)
    }
  },
  error: (msgOrObj: string | object, dataOrMsg?: unknown) => {
    if (typeof msgOrObj === 'string') {
      console.error(`[ERROR] ${msgOrObj}`, dataOrMsg || '')
    } else {
      console.error(`[ERROR] ${dataOrMsg}`, msgOrObj)
    }
  },
  debug: (msgOrObj: string | object, dataOrMsg?: unknown) => {
    if (!isDev) return
    if (typeof msgOrObj === 'string') {
      console.debug(`[DEBUG] ${msgOrObj}`, dataOrMsg || '')
    } else {
      console.debug(`[DEBUG] ${dataOrMsg}`, msgOrObj)
    }
  },
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'
