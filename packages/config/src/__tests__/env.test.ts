import { describe, it, expect } from 'vitest'
import { getEnv, isDevelopment, isProduction } from '../env.js'

describe('@ezstart/config - Environment', () => {
  describe('getEnv', () => {
    it('should return current environment', () => {
      const env = getEnv()

      expect(['development', 'production', 'test']).toContain(env)
    })

    it('should default to development if NODE_ENV not set', () => {
      const originalEnv = process.env.NODE_ENV
      delete process.env.NODE_ENV

      const env = getEnv()

      expect(env).toBe('development')

      // Restore
      process.env.NODE_ENV = originalEnv
    })

    it('should return test in test environment', () => {
      const env = getEnv()

      // Vitest sets NODE_ENV=test
      expect(env).toBe('test')
    })
  })

  describe('isDevelopment', () => {
    it('should return boolean', () => {
      const result = isDevelopment()

      expect(typeof result).toBe('boolean')
    })

    it('should be false in test environment', () => {
      // We are in test environment (vitest)
      expect(isDevelopment()).toBe(false)
    })
  })

  describe('isProduction', () => {
    it('should return boolean', () => {
      const result = isProduction()

      expect(typeof result).toBe('boolean')
    })

    it('should be false in test environment', () => {
      // We are in test environment (vitest)
      expect(isProduction()).toBe(false)
    })

    it('should be true when NODE_ENV=production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      expect(isProduction()).toBe(true)
      expect(isDevelopment()).toBe(false)

      // Restore
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Environment consistency', () => {
    it('should not be both development and production', () => {
      const isDev = isDevelopment()
      const isProd = isProduction()

      expect(isDev && isProd).toBe(false)
    })
  })
})
