import { describe, it, expect } from 'vitest'
import { createCorsConfig, getAllowedOrigins } from '../cors.js'

describe('@ezstart/config - CORS', () => {
  describe('getAllowedOrigins', () => {
    it('should return all web app origins for ezauth', () => {
      const origins = getAllowedOrigins('ezauth')

      // EZAuth is called by ALL apps (SSO)
      expect(origins.length).toBeGreaterThan(5)
      expect(origins).toContain('http://localhost:5050') // ezstart
      expect(origins).toContain('http://localhost:5025') // ezbill
      expect(origins).toContain('http://localhost:5045') // ezpay
    })

    it('should return specific origins for ezbill', () => {
      const origins = getAllowedOrigins('ezbill')

      // EZBill is only called by EZBill web
      expect(origins).toContain('http://localhost:5025')
      expect(origins.length).toBeGreaterThanOrEqual(1)
    })

    it('should include production URLs in production', () => {
      // Mock NODE_ENV
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const origins = getAllowedOrigins('ezauth')

      expect(origins.some(url => url.includes('https://'))).toBe(true)
      expect(origins.some(url => url.includes('ezstart.xyz'))).toBe(true)

      // Restore
      process.env.NODE_ENV = originalEnv
    })

    it('should not include localhost in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const origins = getAllowedOrigins('ezauth')

      expect(origins.some(url => url.includes('localhost'))).toBe(false)

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('createCorsConfig', () => {
    it('should return valid CORS config object', () => {
      const config = createCorsConfig('ezauth')

      expect(config).toHaveProperty('origin')
      expect(config).toHaveProperty('credentials')
      expect(config.credentials).toBe(true)
    })

    it('should have origin as array', () => {
      const config = createCorsConfig('ezauth')

      expect(Array.isArray(config.origin)).toBe(true)
      expect((config.origin as string[]).length).toBeGreaterThan(0)
    })

    it('should allow all web apps for ezauth', () => {
      const config = createCorsConfig('ezauth')
      const origins = config.origin as string[]

      // EZAuth API is called by all apps (SSO)
      expect(origins).toContain('http://localhost:5050') // ezstart
      expect(origins).toContain('http://localhost:5025') // ezbill
      expect(origins).toContain('http://localhost:5045') // ezpay
    })

    it('should only allow ezbill web for ezbill API', () => {
      const config = createCorsConfig('ezbill')
      const origins = config.origin as string[]

      expect(origins).toContain('http://localhost:5025')
      // Should not contain other apps
      expect(origins).not.toContain('http://localhost:5050') // ezstart
    })

    it('should handle ezpay with multiple callers', () => {
      const config = createCorsConfig('ezpay')
      const origins = config.origin as string[]

      // EZPay is called by apps with payments
      expect(origins.length).toBeGreaterThan(1)
    })
  })

  describe('CORS security', () => {
    it('should always have credentials: true', () => {
      const apps = ['ezauth', 'ezbill', 'ezpay']

      apps.forEach(app => {
        const config = createCorsConfig(app as any)
        expect(config.credentials).toBe(true)
      })
    })

    it('should not have wildcard origin', () => {
      const apps = ['ezauth', 'ezbill', 'ezpay']

      apps.forEach(app => {
        const config = createCorsConfig(app as any)
        const origins = config.origin as string[]

        expect(origins).not.toContain('*')
      })
    })

    it('should only allow known domains', () => {
      const config = createCorsConfig('ezauth')
      const origins = config.origin as string[]

      origins.forEach(origin => {
        const isLocalhost = origin.includes('localhost')
        const isVercel = origin.includes('vercel.app')
        const isEzstart = origin.includes('ezstart.xyz')
        const isCustomDomain = origin.includes('asc-tcd.com') || origin.includes('ai-greenpulse.com')

        expect(isLocalhost || isVercel || isEzstart || isCustomDomain).toBe(true)
      })
    })
  })
})
