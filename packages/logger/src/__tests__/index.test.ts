import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Logger } from '../index.js'

/**
 * Reload the module after stubbing `NODE_ENV` so the module-level
 * `isDev` flag is recomputed for the test case.
 */
async function loadLoggerWith(nodeEnv: string | undefined): Promise<Logger> {
  vi.resetModules()
  if (nodeEnv === undefined) {
    vi.stubEnv('NODE_ENV', '')
  } else {
    vi.stubEnv('NODE_ENV', nodeEnv)
  }
  const mod = await import('../index.js')
  return mod.logger
}

describe('@ezstart/logger (browser variant)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>
  let debugSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    debugSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  describe('Logger interface', () => {
    it('exposes debug / info / warn / error', async () => {
      const logger = await loadLoggerWith('development')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })
  })

  describe('Call signatures (development)', () => {
    let logger: Logger

    beforeEach(async () => {
      logger = await loadLoggerWith('development')
    })

    it('legacy (message, data) routes to console.log with [INFO] prefix', () => {
      logger.info('User clicked', { id: 1 })
      expect(logSpy).toHaveBeenCalledOnce()
      expect(logSpy.mock.calls[0]?.[0]).toBe('[INFO] User clicked')
      expect(logSpy.mock.calls[0]?.[1]).toEqual({ id: 1 })
    })

    it('Pino native (data, message) routes to console.log with [INFO] prefix', () => {
      logger.info({ id: 1 }, 'User clicked')
      expect(logSpy).toHaveBeenCalledOnce()
      expect(logSpy.mock.calls[0]?.[0]).toBe('[INFO] User clicked')
      expect(logSpy.mock.calls[0]?.[1]).toEqual({ id: 1 })
    })

    it('message-only call works without crashing', () => {
      logger.info('Simple log')
      expect(logSpy).toHaveBeenCalledOnce()
      expect(logSpy.mock.calls[0]?.[0]).toBe('[INFO] Simple log')
      expect(logSpy.mock.calls[0]?.[1]).toBe('')
    })

    it('warn routes to console.warn', () => {
      logger.warn({ ip: '127.0.0.1' }, 'Rate limit exceeded')
      expect(warnSpy).toHaveBeenCalledOnce()
      expect(warnSpy.mock.calls[0]?.[0]).toBe('[WARN] Rate limit exceeded')
      expect(warnSpy.mock.calls[0]?.[1]).toEqual({ ip: '127.0.0.1' })
    })

    it('error routes to console.error and accepts Error objects', () => {
      const err = new Error('Boom')
      logger.error({ err }, 'Crash')
      expect(errorSpy).toHaveBeenCalledOnce()
      expect(errorSpy.mock.calls[0]?.[0]).toBe('[ERROR] Crash')
      expect(errorSpy.mock.calls[0]?.[1]).toEqual({ err })
    })

    it('debug routes to console.debug', () => {
      logger.debug({ query: 'SELECT 1' }, 'Query executed')
      expect(debugSpy).toHaveBeenCalledOnce()
      expect(debugSpy.mock.calls[0]?.[0]).toBe('[DEBUG] Query executed')
      expect(debugSpy.mock.calls[0]?.[1]).toEqual({ query: 'SELECT 1' })
    })
  })

  describe('Production gating', () => {
    let logger: Logger

    beforeEach(async () => {
      logger = await loadLoggerWith('production')
    })

    it('suppresses debug', () => {
      logger.debug({ q: 1 }, 'Query')
      expect(debugSpy).not.toHaveBeenCalled()
      expect(logSpy).not.toHaveBeenCalled()
    })

    it('suppresses info', () => {
      logger.info({ id: 1 }, 'Click')
      expect(logSpy).not.toHaveBeenCalled()
    })

    it('still logs warn', () => {
      logger.warn({ ip: '127.0.0.1' }, 'Limit')
      expect(warnSpy).toHaveBeenCalledOnce()
    })

    it('still logs error', () => {
      logger.error({ err: 'oops' }, 'Crash')
      expect(errorSpy).toHaveBeenCalledOnce()
    })
  })

  describe('Development variants', () => {
    it('logs debug + info when NODE_ENV is undefined / empty', async () => {
      const logger = await loadLoggerWith(undefined)
      logger.debug('Debug')
      logger.info('Info')
      expect(debugSpy).toHaveBeenCalledOnce()
      expect(logSpy).toHaveBeenCalledOnce()
    })

    it('logs debug + info when NODE_ENV=development', async () => {
      const logger = await loadLoggerWith('development')
      logger.debug('Debug')
      logger.info('Info')
      expect(debugSpy).toHaveBeenCalledOnce()
      expect(logSpy).toHaveBeenCalledOnce()
    })
  })

  describe('Resilience', () => {
    it('falls back to console.log when console.debug is missing', async () => {
      // Load the module FIRST while console.debug is the spy, then swap
      // console.debug for a non-function value to simulate a legacy
      // runtime that lacks it.
      const logger = await loadLoggerWith('development')

      const original = console.debug
      // @ts-expect-error intentional override to simulate legacy runtime
      console.debug = undefined
      try {
        logger.debug('No debug here')
        expect(logSpy).toHaveBeenCalledOnce()
        expect(logSpy.mock.calls[0]?.[0]).toBe('[DEBUG] No debug here')
      } finally {
        console.debug = original
      }
    })
  })
})
