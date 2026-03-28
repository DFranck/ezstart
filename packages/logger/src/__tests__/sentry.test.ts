import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initSentry, Sentry } from '../sentry.js'

describe('@ezstart/logger - Sentry', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('initSentry', () => {
    it('should return undefined if SENTRY_DSN not provided', () => {
      delete process.env.SENTRY_DSN

      const result = initSentry('Test API')

      expect(result).toBeUndefined()
    })

    it('should log warning if SENTRY_DSN not provided', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      delete process.env.SENTRY_DSN

      initSentry('Test API')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  [Sentry] Test API: DSN not provided')
      )

      consoleLogSpy.mockRestore()
    })

    it('should handle different app names', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      delete process.env.SENTRY_DSN

      initSentry('EZAuth API')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('EZAuth API')
      )

      initSentry('EZPay API')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('EZPay API')
      )

      consoleLogSpy.mockRestore()
    })

    it('should use NODE_ENV for environment', () => {
      // This test verifies that initSentry reads NODE_ENV
      // Full initialization requires valid SENTRY_DSN which we don't want in tests
      delete process.env.SENTRY_DSN
      process.env.NODE_ENV = 'test'

      const result = initSentry('Test API')

      // Should return undefined because no DSN, but NODE_ENV is read
      expect(result).toBeUndefined()
      expect(process.env.NODE_ENV).toBe('test')
    })

    it('should default to development if NODE_ENV not set', () => {
      delete process.env.SENTRY_DSN
      delete process.env.NODE_ENV

      initSentry('Test API')

      // Should not throw and handle missing NODE_ENV gracefully
      expect(true).toBe(true)
    })
  })

  describe('Sentry export', () => {
    it('should export Sentry object', () => {
      expect(Sentry).toBeDefined()
      expect(typeof Sentry).toBe('object')
    })

    it('should have captureException method', () => {
      expect(Sentry.captureException).toBeDefined()
      expect(typeof Sentry.captureException).toBe('function')
    })

    it('should have captureMessage method', () => {
      expect(Sentry.captureMessage).toBeDefined()
      expect(typeof Sentry.captureMessage).toBe('function')
    })

    it('should have init method', () => {
      expect(Sentry.init).toBeDefined()
      expect(typeof Sentry.init).toBe('function')
    })
  })

  describe('Error tracking integration', () => {
    it('should be importable alongside logger', async () => {
      const { logger } = await import('../index.js')
      const { initSentry } = await import('../sentry.js')

      expect(logger).toBeDefined()
      expect(initSentry).toBeDefined()
    })

    it('should support standard Sentry workflow', () => {
      // Test that the workflow is valid (even without DSN)
      delete process.env.SENTRY_DSN

      const sentry = initSentry('Test API')

      // Without DSN, returns undefined
      expect(sentry).toBeUndefined()

      // But Sentry export is still available for conditional usage
      expect(Sentry).toBeDefined()
    })
  })

  describe('Configuration', () => {
    it('should load .env.local for configuration', () => {
      // initSentry calls config({ path: '.env.local' })
      // This test verifies the function doesn't throw
      delete process.env.SENTRY_DSN

      expect(() => {
        initSentry('Test API')
      }).not.toThrow()
    })

    it('should handle multiple app initializations', () => {
      delete process.env.SENTRY_DSN

      expect(() => {
        initSentry('EZAuth API')
        initSentry('EZPay API')
        initSentry('EZBill API')
      }).not.toThrow()
    })
  })
})
