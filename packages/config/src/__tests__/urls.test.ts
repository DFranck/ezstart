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
      const appsWithAPI = ['ezauth', 'ezbill', 'ezpay', 'green-pulse', 'monitoring']

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

      expect(url).toBe('http://localhost:6101')
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

      expect(url).toBe('http://localhost:6110')
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

      expect(port).toBe(6101)
    })

    it('should extract port from API URL', () => {
      const port = getPort('ezauth', 'api')

      expect(port).toBe(6110)
    })

    it('should throw for apps without API when requesting api port', () => {
      expect(() => getPort('fengshui', 'api')).toThrow('No api URL defined')
    })

    it('should return different ports for different apps', () => {
      const ezstartPort = getPort('ezstart', 'web')
      const ezbillPort = getPort('ezbill', 'web')

      expect(ezstartPort).not.toBe(ezbillPort)
      expect(ezstartPort).toBe(6101)
      expect(ezbillPort).toBe(6121)
    })

    it('should follow 61xx port pattern', () => {
      const apps: Array<keyof typeof URLS> = ['ezstart', 'ezauth', 'ezbill', 'ezpay']

      apps.forEach(app => {
        const port = getPort(app, 'web')
        expect(port).toBeGreaterThanOrEqual(6100)
        expect(port).toBeLessThan(6200)
      })
    })
  })

  describe('Port pattern consistency', () => {
    it('should have APIs on 6XX0 and Web on 6XX1', () => {
      // APIs should be on ports ending in 0
      expect(getPort('ezauth', 'api')).toBe(6110)
      expect(getPort('ezbill', 'api')).toBe(6120)

      // Web should be on ports ending in 1
      expect(getPort('ezauth', 'web')).toBe(6111)
      expect(getPort('ezbill', 'web')).toBe(6121)
    })

    it('should have unique ports for each service', () => {
      const ports = new Set<number>()
      const apps: Array<keyof typeof URLS> = ['ezstart', 'ezauth', 'ezbill', 'ezpay', 'green-pulse']

      apps.forEach(app => {
        const webPort = getPort(app, 'web')
        ports.add(webPort)

        if (URLS[app].api) {
          const apiPort = getPort(app, 'api')
          ports.add(apiPort)
        }
      })

      // 5 unique web ports + 5 API ports = 10 total
      const expectedCount = 10

      expect(ports.size).toBe(expectedCount)
    })
  })
})
