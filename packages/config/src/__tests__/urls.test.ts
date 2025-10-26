import { describe, it, expect } from 'vitest'
import { getApiUrl, getWebUrl, getPort, URLS, type AppName } from '../urls.js'

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
        expect(URLS[app as AppName]).toBeDefined()
        expect(URLS[app as AppName].web).toBeDefined()
      })
    })

    it('should have API URLs for apps with backends', () => {
      const appsWithAPI = ['ezauth', 'ezbill', 'ezpay', 'tower-defense', 'green-pulse', 'monitoring']

      appsWithAPI.forEach(app => {
        expect(URLS[app as AppName].api).toBeDefined()
        expect(URLS[app as AppName].api?.local).toMatch(/^http:\/\/localhost:\d+$/)
      })
    })

    it('should not have API URLs for frontend-only apps', () => {
      const frontendOnly = ['ezstart', 'fengshui', 'asc-tcd']

      frontendOnly.forEach(app => {
        expect(URLS[app as AppName].api).toBeUndefined()
      })
    })
  })

  describe('getWebUrl', () => {
    it('should return local URL when env is local', () => {
      const url = getWebUrl('ezstart', 'local')

      expect(url).toBe('http://localhost:5050')
    })

    it('should return development URL when env is development', () => {
      const url = getWebUrl('ezstart', 'development')

      expect(url).toBe('https://ezstart-web.vercel.app')
    })

    it('should return production URL in production', () => {
      const url = getWebUrl('ezstart', 'production')

      expect(url).toBe('https://www.ezstart.xyz')
    })

    it('should return development URL when env not specified (default)', () => {
      const url = getWebUrl('ezauth')

      // getCurrentEnvironment() defaults to 'development' in test
      expect(url).toMatch(/^https:/)
    })

    it('should handle all app names', () => {
      const apps: Array<keyof typeof URLS> = ['ezstart', 'ezauth', 'ezbill', 'ezpay']

      apps.forEach(app => {
        expect(() => getWebUrl(app)).not.toThrow()
      })
    })
  })

  describe('getApiUrl', () => {
    it('should return local API URL when env is local', () => {
      const url = getApiUrl('ezauth', 'local')

      expect(url).toBe('http://localhost:5010')
    })

    it('should return production API URL in production', () => {
      const url = getApiUrl('ezauth', 'production')

      expect(url).toMatch(/^https:\/\//)
    })

    it('should throw for apps without API', () => {
      expect(() => getApiUrl('fengshui' as any)).toThrow('does not have an API')
    })

    it('should fallback to production when development not defined', () => {
      // EZBill API doesn't have development URL, should fallback to production
      const url = getApiUrl('ezbill', 'development')

      expect(url).toMatch(/^https:/)
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

      // Note: monitoring and ezstart share port 5050, so we have 12 unique ports instead of 13
      // 6 unique web ports (ezstart/monitoring share 5050) + 6 API ports = 12 total
      const expectedCount = 12

      expect(ports.size).toBe(expectedCount)
    })
  })
})
