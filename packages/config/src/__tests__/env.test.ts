import { describe, it, expect } from 'vitest'
import { getCurrentEnvironment, isDevelopment, isProduction } from '../env.js'

describe('@ezstart/config - Environment', () => {
  describe('getCurrentEnvironment', () => {
    it('should return current environment', () => {
      const env = getCurrentEnvironment()

      expect(['local', 'development', 'production']).toContain(env)
    })

    it('should default to development if NODE_ENV not set', () => {
      const originalEnv = process.env.NODE_ENV
      delete process.env.NODE_ENV

      const env = getCurrentEnvironment()

      expect(env).toBe('development')

      // Restore
      process.env.NODE_ENV = originalEnv
    })

    it('should return development in test environment', () => {
      const env = getCurrentEnvironment()

      // Vitest sets NODE_ENV=test, which maps to 'development'
      expect(env).toBe('development')
    })
  })

  describe('isDevelopment', () => {
    it('should return boolean', () => {
      const result = isDevelopment()

      expect(typeof result).toBe('boolean')
    })

    it('should be true in test environment', () => {
      // Vitest sets NODE_ENV=test, which maps to 'development'
      expect(isDevelopment()).toBe(true)
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
