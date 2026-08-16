import { describe, it, expect } from 'vitest'
import { getCurrentEnvironment, isDevelopment, isLocal, isProduction } from '../env.js'

describe('@ezstart/config - Environment', () => {
  describe('getCurrentEnvironment', () => {
    it('should return current environment', () => {
      const env = getCurrentEnvironment()

      expect(['local', 'development', 'staging', 'production']).toContain(env)
    })

    it('should default to local if NODE_ENV not set', () => {
      const originalEnv = process.env.NODE_ENV
      delete process.env.NODE_ENV

      const env = getCurrentEnvironment()

      expect(env).toBe('local')

      // Restore
      process.env.NODE_ENV = originalEnv
    })

    it('should return local in test environment', () => {
      const env = getCurrentEnvironment()

      // Vitest sets NODE_ENV=test, which is non-production server-side → 'local'
      expect(env).toBe('local')
    })
  })

  describe('isDevelopment', () => {
    it('should return boolean', () => {
      const result = isDevelopment()

      expect(typeof result).toBe('boolean')
    })

    it('should be false in test environment (vitest runs as local)', () => {
      // Vitest sets NODE_ENV=test, which maps to 'local', not 'development'
      // ('development' is reserved for remote dev envs like Vercel preview non-staging)
      expect(isDevelopment()).toBe(false)
    })
  })

  describe('isLocal', () => {
    it('should return boolean', () => {
      const result = isLocal()

      expect(typeof result).toBe('boolean')
    })

    it('should be true in test environment', () => {
      // Vitest sets NODE_ENV=test, which maps to 'local'
      expect(isLocal()).toBe(true)
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
