import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../index.js'

describe('@ezstart/logger - Pino Logger', () => {
  // Spy on console methods to verify logging
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleInfoSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('logger.info', () => {
    it('should support old format (message, data)', () => {
      expect(() => {
        logger.info('User logged in', { userId: '123' })
      }).not.toThrow()
    })

    it('should support Pino format (data, message)', () => {
      expect(() => {
        logger.info({ userId: '123', email: 'user@example.com' }, 'User logged in')
      }).not.toThrow()
    })

    it('should handle message without data', () => {
      expect(() => {
        logger.info('Simple log message')
      }).not.toThrow()
    })
  })

  describe('logger.warn', () => {
    it('should support old format (message, data)', () => {
      expect(() => {
        logger.warn('Rate limit exceeded', { ip: '127.0.0.1' })
      }).not.toThrow()
    })

    it('should support Pino format (data, message)', () => {
      expect(() => {
        logger.warn({ ip: '127.0.0.1', attempts: 10 }, 'Rate limit exceeded')
      }).not.toThrow()
    })
  })

  describe('logger.error', () => {
    it('should support old format (message, data)', () => {
      expect(() => {
        logger.error('Payment failed', { error: new Error('Test'), paymentId: 'pay_123' })
      }).not.toThrow()
    })

    it('should support Pino format (data, message)', () => {
      expect(() => {
        logger.error({ error: new Error('Test'), paymentId: 'pay_123' }, 'Payment failed')
      }).not.toThrow()
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error')
      expect(() => {
        logger.error('Error occurred', { error })
      }).not.toThrow()
    })
  })

  describe('logger.debug', () => {
    it('should support old format (message, data)', () => {
      expect(() => {
        logger.debug('Database query executed', { query: 'SELECT * FROM users', duration: 150 })
      }).not.toThrow()
    })

    it('should support Pino format (data, message)', () => {
      expect(() => {
        logger.debug({ query: 'SELECT * FROM users', duration: 150 }, 'Database query executed')
      }).not.toThrow()
    })
  })

  describe('Backward compatibility', () => {
    it('should work with legacy code using (message, data) format', () => {
      expect(() => {
        logger.info('Old format', { legacy: true })
        logger.warn('Old format warning', { count: 5 })
        logger.error('Old format error', { code: 500 })
        logger.debug('Old format debug', { verbose: true })
      }).not.toThrow()
    })

    it('should work with modern code using (data, message) format', () => {
      expect(() => {
        logger.info({ modern: true }, 'New format')
        logger.warn({ count: 5 }, 'New format warning')
        logger.error({ code: 500 }, 'New format error')
        logger.debug({ verbose: true }, 'New format debug')
      }).not.toThrow()
    })
  })

  describe('Logger interface', () => {
    it('should expose info method', () => {
      expect(logger.info).toBeDefined()
      expect(typeof logger.info).toBe('function')
    })

    it('should expose warn method', () => {
      expect(logger.warn).toBeDefined()
      expect(typeof logger.warn).toBe('function')
    })

    it('should expose error method', () => {
      expect(logger.error).toBeDefined()
      expect(typeof logger.error).toBe('function')
    })

    it('should expose debug method', () => {
      expect(logger.debug).toBeDefined()
      expect(typeof logger.debug).toBe('function')
    })
  })
})
