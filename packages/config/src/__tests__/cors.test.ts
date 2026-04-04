import { describe, it, expect } from 'vitest'
import { createCorsConfig, getAllowedOrigins } from '../cors.js'

describe('@ezstart/config - CORS', () => {
  describe('getAllowedOrigins', () => {
    it('should return all web app origins for ezauth', () => {
      const origins = getAllowedOrigins('ezauth')

      // EZAuth is called by ALL apps (SSO)
      expect(origins.length).toBeGreaterThan(5)
      expect(origins).toContain('http://localhost:6101') // ezstart
      expect(origins).toContain('http://localhost:6121') // ezbill
      expect(origins).toContain('http://localhost:6131') // ezpay
    })

    it('should return specific origins for ezbill', () => {
      const origins = getAllowedOrigins('ezbill')

      // EZBill is only called by EZBill web
      expect(origins).toContain('http://localhost:6121')
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

    it('should include localhost URLs (getAllWebUrls returns all 3 environments)', () => {
      const origins = getAllowedOrigins('ezauth')

      // getAllWebUrls() returns [local, development, production] for each app
      // So localhost URLs are ALWAYS included in the allowed origins array
      expect(origins.some(url => url.includes('localhost'))).toBe(true)
    })
  })

  describe('createCorsConfig', () => {
    it('should return valid CORS config object', () => {
      const config = createCorsConfig('ezauth')

      expect(config).toHaveProperty('origin')
      expect(config).toHaveProperty('credentials')
      expect(config.credentials).toBe(true)
    })

    it('should have origin as function', () => {
      const config = createCorsConfig('ezauth')

      expect(typeof config.origin).toBe('function')
    })

    it('should allow all web apps for ezauth', () => {
      const origins = getAllowedOrigins('ezauth')

      // EZAuth API is called by all apps (SSO)
      expect(origins).toContain('http://localhost:6101') // ezstart
      expect(origins).toContain('http://localhost:6121') // ezbill
      expect(origins).toContain('http://localhost:6131') // ezpay
    })

    it('should only allow ezbill web for ezbill API', () => {
      const origins = getAllowedOrigins('ezbill')

      expect(origins).toContain('http://localhost:6121')
      // Should not contain other apps
      expect(origins).not.toContain('http://localhost:6101') // ezstart
    })

    it('should handle ezpay with multiple callers', () => {
      const origins = getAllowedOrigins('ezpay')

      // EZPay is called by apps with payments (ezpay, ezbill, fengshui)
      expect(origins.length).toBeGreaterThan(3)
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
        const origins = getAllowedOrigins(app as any)

        expect(origins).not.toContain('*')
      })
    })

    it('should only allow known domains', () => {
      const origins = getAllowedOrigins('ezauth')

      origins.forEach(origin => {
        const isLocalhost = origin.includes('localhost')
        const isVercel = origin.includes('vercel.app')
        const isEzstart = origin.includes('ezstart.xyz')
        const isCustomDomain =
          origin.includes('asc-tcd.com') || origin.includes('ai-greenpulse.com')

        expect(isLocalhost || isVercel || isEzstart || isCustomDomain).toBe(true)
      })
    })
  })
})
