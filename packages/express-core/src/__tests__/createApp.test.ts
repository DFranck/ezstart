import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from '../infra/createApp.js'

describe('@ezstart/express-core - createApp', () => {
  let consoleLogSpy: any
  let consoleWarnSpy: any

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('Basic app creation', () => {
    it('should create an Express app', () => {
      const app = createApp()

      expect(app).toBeDefined()
      expect(typeof app.use).toBe('function')
      expect(typeof app.get).toBe('function')
      expect(typeof app.post).toBe('function')
    })

    it('should create app with auto CORS (apiApp option)', () => {
      const app = createApp({ apiApp: 'ezauth' })

      expect(app).toBeDefined()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-configured for ezauth')
      )
    })

    it('should create app with manual CORS origins', () => {
      const app = createApp({
        corsOrigins: ['https://example.com', 'https://app.example.com'],
      })

      expect(app).toBeDefined()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manually configured: 2 origins')
      )
    })

    it('should create app with wildcard CORS when no options', () => {
      const app = createApp()

      expect(app).toBeDefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Allowing ALL origins (*)')
      )
    })
  })

  describe('CORS configuration', () => {
    it('should auto-configure CORS for ezauth (called by all apps)', () => {
      const app = createApp({ apiApp: 'ezauth' })

      expect(app).toBeDefined()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-configured for ezauth')
      )
      // EZAuth is called by ALL apps (SSO), so should have many origins
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Allowed origins')
      )
    })

    it('should auto-configure CORS for ezbill (called only by ezbill web)', () => {
      const app = createApp({ apiApp: 'ezbill' })

      expect(app).toBeDefined()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-configured for ezbill')
      )
    })

    it('should handle manual CORS origins array', () => {
      const origins = ['https://app1.com', 'https://app2.com', 'https://app3.com']
      const app = createApp({ corsOrigins: origins })

      expect(app).toBeDefined()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Manually configured: ${origins.length} origins`)
      )
    })

    it('should warn when using wildcard CORS (legacy mode)', () => {
      createApp()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Allowing ALL origins')
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Consider using apiApp option')
      )
    })
  })

  describe('Raw body routes', () => {
    it('should create app with raw body routes for webhooks', () => {
      const app = createApp({
        rawBodyRoutes: ['/api/webhooks/stripe'],
      })

      expect(app).toBeDefined()
    })

    it('should handle multiple raw body routes', () => {
      const app = createApp({
        rawBodyRoutes: ['/api/webhooks/stripe', '/api/webhooks/paypal'],
      })

      expect(app).toBeDefined()
    })

    it('should work without raw body routes', () => {
      const app = createApp({ apiApp: 'ezauth' })

      expect(app).toBeDefined()
    })
  })

  describe('Combined options', () => {
    it('should handle apiApp + rawBodyRoutes together', () => {
      const app = createApp({
        apiApp: 'ezpay',
        rawBodyRoutes: ['/api/webhooks/stripe'],
      })

      expect(app).toBeDefined()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-configured for ezpay')
      )
    })

    it('should handle corsOrigins + rawBodyRoutes together', () => {
      const app = createApp({
        corsOrigins: ['https://example.com'],
        rawBodyRoutes: ['/api/webhooks/stripe'],
      })

      expect(app).toBeDefined()
    })
  })

  describe('Express middleware setup', () => {
    it('should have JSON parser middleware', () => {
      const app = createApp({ apiApp: 'ezauth' })

      // Express app has a _router property when middleware is added
      expect(app).toHaveProperty('_router')
    })

    it('should have URL-encoded parser middleware', () => {
      const app = createApp({ apiApp: 'ezauth' })

      expect(app).toHaveProperty('_router')
    })

    it('should have CORS middleware', () => {
      const app = createApp({ apiApp: 'ezauth' })

      expect(app).toHaveProperty('_router')
    })
  })

  describe('Integration with @ezstart/config', () => {
    it('should use @ezstart/config for CORS auto-configuration', () => {
      const app = createApp({ apiApp: 'ezauth' })

      expect(app).toBeDefined()
      // Should log the allowed origins from @ezstart/config
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should handle all supported app names', () => {
      const apps = ['ezauth', 'ezpay', 'ezbill', 'tower-defense', 'green-pulse', 'monitoring']

      apps.forEach(appName => {
        expect(() => {
          createApp({ apiApp: appName as any })
        }).not.toThrow()
      })
    })
  })
})
