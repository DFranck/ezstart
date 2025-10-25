import { describe, it, expect } from 'vitest'
import { getApiUrl, getWebUrl, getPort, URLS } from '../urls.js'

describe('@ezstart/config - URLs', () => {
  describe('URLS constant', () => {
    it('should have all app configurations', () => {
      const appNames = [
        'ezstart',
        'ezauth',
        'ezbill',
        'ezpay',
        'fengshui',
        'tower-defense',
        'asc-tcd',
        'green-pulse',
        'monitoring',
      ]

      appNames.forEach(app => {
        expect(URLS[app]).toBeDefined()
        expect(URLS[app].web).toBeDefined()
      })
    })

    it('should have API URLs for apps with backends', () => {
      const appsWithAPI = ['ezauth', 'ezbill', 'ezpay', 'tower-defense', 'green-pulse', 'monitoring']

      appsWithAPI.forEach(app => {
        expect(URLS[app].api).toBeDefined()
        expect(URLS[app].api?.local).toMatch(/^http:\/\/localhost:\d+$/)
      })
    })

    it('should not have API URLs for frontend-only apps', () => {
      const frontendOnly = ['ezstart', 'fengshui', 'asc-tcd']

      frontendOnly.forEach(app => {
        expect(URLS[app].api).toBeUndefined()
      })
    })
  })

  describe('getWebUrl', () => {
    it('should return local URL in development', () => {
      const url = getWebUrl('ezstart', 'development')

      expect(url).toBe('http://localhost:5050')
    })

    it('should return production URL in production', () => {
      const url = getWebUrl('ezstart', 'production')

      expect(url).toBe('https://www.ezstart.xyz')
    })

    it('should return local URL when env not specified', () => {
      const url = getWebUrl('ezauth')

      expect(url).toMatch(/^http:\/\/localhost:\d+$/)
    })

    it('should handle all app names', () => {
      const apps: Array<keyof typeof URLS> = ['ezstart', 'ezauth', 'ezbill', 'ezpay']

      apps.forEach(app => {
        expect(() => getWebUrl(app)).not.toThrow()
      })
    })
  })

  describe('getApiUrl', () => {
    it('should return local API URL in development', () => {
      const url = getApiUrl('ezauth', 'development')

      expect(url).toBe('http://localhost:5010')
    })

    it('should return production API URL in production', () => {
      const url = getApiUrl('ezauth', 'production')

      expect(url).toMatch(/^https:\/\//)
    })

    it('should throw for apps without API', () => {
      expect(() => getApiUrl('fengshui' as any)).toThrow('No API URL defined')
    })

    it('should return local URL when env not specified', () => {
      const url = getApiUrl('ezbill')

      expect(url).toBe('http://localhost:5020')
    })
  })

  describe('getPort', () => {
    it('should extract port from web URL', () => {
      const port = getPort('ezstart', 'web')

      expect(port).toBe(5050)
    })

    it('should extract port from API URL', () => {
      const port = getPort('ezauth', 'api')

      expect(port).toBe(5010)
    })

    it('should throw for apps without API when requesting api port', () => {
      expect(() => getPort('fengshui', 'api')).toThrow('No api URL defined')
    })

    it('should return different ports for different apps', () => {
      const ezstartPort = getPort('ezstart', 'web')
      const ezbillPort = getPort('ezbill', 'web')

      expect(ezstartPort).not.toBe(ezbillPort)
      expect(ezstartPort).toBe(5050)
      expect(ezbillPort).toBe(5025)
    })

    it('should follow 50xx port pattern', () => {
      const apps: Array<keyof typeof URLS> = ['ezstart', 'ezauth', 'ezbill', 'ezpay']

      apps.forEach(app => {
        const port = getPort(app, 'web')
        expect(port).toBeGreaterThanOrEqual(5000)
        expect(port).toBeLessThan(6000)
      })
    })
  })

  describe('Port pattern consistency', () => {
    it('should have APIs on 50x0 and Web on 50x5', () => {
      // APIs should be on ports ending in 0
      expect(getPort('ezauth', 'api')).toBe(5010)
      expect(getPort('ezbill', 'api')).toBe(5020)
      expect(getPort('tower-defense', 'api')).toBe(5030)

      // Web should be on ports ending in 5
      expect(getPort('ezauth', 'web')).toBe(5015)
      expect(getPort('ezbill', 'web')).toBe(5025)
      expect(getPort('tower-defense', 'web')).toBe(5035)
    })

    it('should have unique ports for each service', () => {
      const ports = new Set<number>()
      const apps: Array<keyof typeof URLS> = [
        'ezstart',
        'ezauth',
        'ezbill',
        'ezpay',
        'tower-defense',
        'green-pulse',
        'monitoring',
      ]

      apps.forEach(app => {
        const webPort = getPort(app, 'web')
        ports.add(webPort)

        if (URLS[app].api) {
          const apiPort = getPort(app, 'api')
          ports.add(apiPort)
        }
      })

      // Number of unique ports should equal total services
      const expectedCount =
        apps.length + // web ports
        apps.filter(app => URLS[app].api).length // api ports

      expect(ports.size).toBe(expectedCount)
    })
  })
})
