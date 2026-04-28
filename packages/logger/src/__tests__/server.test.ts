import { Writable } from 'node:stream'
import pino from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLogger, type Logger } from '../server.js'

/**
 * Build a Pino logger that writes JSON lines into an in-memory buffer so
 * tests can assert on emitted records without touching stdout.
 */
function makeCapturingLogger(level: pino.LevelWithSilent = 'debug'): {
  logger: Logger
  records: Array<Record<string, unknown>>
} {
  const records: Array<Record<string, unknown>> = []
  const stream = new Writable({
    write(chunk, _enc, cb) {
      const line = chunk.toString().trim()
      if (line.length > 0) {
        records.push(JSON.parse(line) as Record<string, unknown>)
      }
      cb()
    },
  })
  const pinoInstance = pino({ level }, stream)
  return { logger: createLogger(pinoInstance), records }
}

describe('@ezstart/logger/server', () => {
  describe('Logger interface', () => {
    it('exposes debug / info / warn / error', async () => {
      const { logger } = await import('../server.js')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })
  })

  describe('createLogger — both call signatures', () => {
    it('legacy (message, data) is forwarded to Pino as (data, message)', () => {
      const { logger, records } = makeCapturingLogger('debug')
      logger.info('User logged in', { userId: '123' })
      expect(records).toHaveLength(1)
      expect(records[0]?.msg).toBe('User logged in')
      expect(records[0]?.userId).toBe('123')
    })

    it('Pino native (data, message) is preserved', () => {
      const { logger, records } = makeCapturingLogger('debug')
      logger.info({ userId: '123' }, 'User logged in')
      expect(records).toHaveLength(1)
      expect(records[0]?.msg).toBe('User logged in')
      expect(records[0]?.userId).toBe('123')
    })

    it('warn / error / debug all work on both signatures', () => {
      const { logger, records } = makeCapturingLogger('debug')

      logger.warn('Slow query', { ms: 1200 })
      logger.warn({ ms: 1200 }, 'Slow query')
      logger.error('Crash', { code: 'E_BOOM' })
      logger.error({ code: 'E_BOOM' }, 'Crash')
      logger.debug('Diag', { trace: 'abc' })
      logger.debug({ trace: 'abc' }, 'Diag')

      expect(records).toHaveLength(6)
      // Pino emits numeric levels: 20 debug, 30 info, 40 warn, 50 error
      expect(records[0]?.level).toBe(40)
      expect(records[1]?.level).toBe(40)
      expect(records[2]?.level).toBe(50)
      expect(records[3]?.level).toBe(50)
      expect(records[4]?.level).toBe(20)
      expect(records[5]?.level).toBe(20)
    })

    it('message-only call (no data) does not crash and emits empty data', () => {
      const { logger, records } = makeCapturingLogger('debug')
      logger.info('Booted')
      expect(records).toHaveLength(1)
      expect(records[0]?.msg).toBe('Booted')
    })
  })

  describe('Level filtering', () => {
    it('respects an explicit warn level (suppresses info + debug)', () => {
      const { logger, records } = makeCapturingLogger('warn')
      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')
      expect(records).toHaveLength(2)
      expect(records[0]?.level).toBe(40)
      expect(records[1]?.level).toBe(50)
    })

    it('respects debug level (lets everything through)', () => {
      const { logger, records } = makeCapturingLogger('debug')
      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')
      expect(records).toHaveLength(4)
    })
  })

  describe('Default instance configuration', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
      originalEnv = { ...process.env }
    })

    afterEach(() => {
      process.env = originalEnv
      vi.resetModules()
    })

    it('defaults to "warn" level in production with no LOG_LEVEL', async () => {
      vi.resetModules()
      process.env.NODE_ENV = 'production'
      delete process.env.LOG_LEVEL
      const mod = await import('../server.js')
      expect(mod.pinoLogger.level).toBe('warn')
    })

    it('defaults to "info" level outside production with no LOG_LEVEL', async () => {
      vi.resetModules()
      process.env.NODE_ENV = 'development'
      delete process.env.LOG_LEVEL
      const mod = await import('../server.js')
      expect(mod.pinoLogger.level).toBe('info')
    })

    it('honors LOG_LEVEL env var (overrides production default)', async () => {
      vi.resetModules()
      process.env.NODE_ENV = 'production'
      process.env.LOG_LEVEL = 'debug'
      const mod = await import('../server.js')
      expect(mod.pinoLogger.level).toBe('debug')
    })

    it('honors LOG_LEVEL env var (overrides development default)', async () => {
      vi.resetModules()
      process.env.NODE_ENV = 'development'
      process.env.LOG_LEVEL = 'error'
      const mod = await import('../server.js')
      expect(mod.pinoLogger.level).toBe('error')
    })
  })
})
