import pino from 'pino'

/**
 * Base Pino logger instance
 */
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

/**
 * Server-side logger with Pino + Sentry
 *
 * Use this ONLY in server environments (APIs, Next.js server components)
 * For client-side logging, use '@ezstart/logger' instead
 *
 * @example
 * ```typescript
 * // In APIs
 * import { logger } from '@ezstart/logger/server'
 *
 * // Old format (backward compatible)
 * logger.info('User logged in', { userId: '123' })
 * logger.error('Payment failed', { error, paymentId })
 *
 * // Pino format (preferred)
 * logger.info({ userId: '123', email: 'user@example.com' }, 'User logged in')
 * logger.error({ error, paymentId }, 'Payment processing failed')
 * ```
 */
export const logger = {
  info: (msgOrObj: string | object, dataOrMsg?: any) => {
    if (typeof msgOrObj === 'string') {
      pinoLogger.info(dataOrMsg || {}, msgOrObj)
    } else {
      pinoLogger.info(msgOrObj, dataOrMsg as string)
    }
  },
  warn: (msgOrObj: string | object, dataOrMsg?: any) => {
    if (typeof msgOrObj === 'string') {
      pinoLogger.warn(dataOrMsg || {}, msgOrObj)
    } else {
      pinoLogger.warn(msgOrObj, dataOrMsg as string)
    }
  },
  error: (msgOrObj: string | object, dataOrMsg?: any) => {
    if (typeof msgOrObj === 'string') {
      pinoLogger.error(dataOrMsg || {}, msgOrObj)
    } else {
      pinoLogger.error(msgOrObj, dataOrMsg as string)
    }
  },
  debug: (msgOrObj: string | object, dataOrMsg?: any) => {
    if (typeof msgOrObj === 'string') {
      pinoLogger.debug(dataOrMsg || {}, msgOrObj)
    } else {
      pinoLogger.debug(msgOrObj, dataOrMsg as string)
    }
  },
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

// Export Sentry utilities
export { initSentry, Sentry } from './sentry.js'
