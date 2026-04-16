import { describe, it, expect } from 'vitest'
import { getApiUrl, getWebUrl, getPort, URLS, type AppName } from '../urls.js'

describe('@ezstart/config - URLs', () => {
  describe('URLS constant', () => {
    it('should have all app configurations', () => {
      const appNames: AppName[] = [
        'ezstart',
        'ezauth',
        'ezbill',
        'ezpay',
        'fengshui',
        'asc-tcd',
        'green-pulse',
        'gacha-analyzer',
      ]

      appNames.forEach(app => {
        expect(URLS[app]).toBeDefined()
        expect(URLS[app].web).toBeDefined()
      })
    })

    it('should have API URLs for apps with backends', () => {
      const appsWithAPI: AppName[] = [
        'ezstart',
        'ezauth',
        'ezbill',
        'ezpay',
        'green-pulse',
        'gacha-analyzer',
      ]

      appsWithAPI.forEach(app => {
        expect(URLS[app].api).toBeDefined()
        expect(URLS[app].api?.local).toMatch(/^http:\/\/localhost:\d+$/)
      })
    })

    it('should not have API URLs for frontend-only apps', () => {
      const frontendOnly: AppName[] = ['asc-tcd']

      frontendOnly.forEach(app => {
        expect(URLS[app].api).toBeUndefined()
      })
    })

    it('should have staging API URLs for all apps with backends', () => {
      const appsWithAPI: AppName[] = [
        'ezstart',
        'ezauth',
        'ezbill',
        'ezpay',
        'green-pulse',
        'gacha-analyzer',
      ]

      appsWithAPI.forEach(app => {
        expect(URLS[app].api?.staging).toMatch(/^https:\/\//)
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

    it('should return staging URL when env is staging', () => {
      const url = getWebUrl('ezstart', 'staging')

      expect(url).toMatch(/staging/)
    })

    it('should return production URL in production', () => {
      const url = getWebUrl('ezstart', 'production')

      expect(url).toBe('https://www.ezstart.xyz')
    })

    it('should handle all app names', () => {
      const apps: AppName[] = ['ezstart', 'ezauth', 'ezbill', 'ezpay']

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

    it('should return staging API URL when env is staging', () => {
      const url = getApiUrl('ezbill', 'staging')

      expect(url).toBe('https://ezbill-api-staging.up.railway.app')
    })

    it('should return production API URL in production', () => {
      const url = getApiUrl('ezauth', 'production')

      expect(url).toMatch(/^https:\/\//)
    })

    it('should throw for apps without API', () => {
      expect(() => getApiUrl('asc-tcd' as AppName)).toThrow('does not have an API')
    })

    it('should fallback to production when development not defined', () => {
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
      expect(() => getPort('asc-tcd', 'api')).toThrow('No api URL defined')
    })

    it('should return different ports for different apps', () => {
      const ezstartPort = getPort('ezstart', 'web')
      const ezbillPort = getPort('ezbill', 'web')

      expect(ezstartPort).not.toBe(ezbillPort)
      expect(ezstartPort).toBe(6101)
      expect(ezbillPort).toBe(6121)
    })

    it('should follow 61xx port pattern', () => {
      const apps: AppName[] = ['ezstart', 'ezauth', 'ezbill', 'ezpay']

      apps.forEach(app => {
        const port = getPort(app, 'web')
        expect(port).toBeGreaterThanOrEqual(6100)
        expect(port).toBeLessThan(6200)
      })
    })
  })

  describe('Port pattern consistency', () => {
    it('should have APIs on 6XX0 and Web on 6XX1', () => {
      expect(getPort('ezauth', 'api')).toBe(6110)
      expect(getPort('ezbill', 'api')).toBe(6120)

      expect(getPort('ezauth', 'web')).toBe(6111)
      expect(getPort('ezbill', 'web')).toBe(6121)
    })

    it('should have unique ports for each service', () => {
      const ports = new Set<number>()
      const apps: AppName[] = ['ezstart', 'ezauth', 'ezbill', 'ezpay', 'green-pulse']

      apps.forEach(app => {
        const webPort = getPort(app, 'web')
        ports.add(webPort)

        if (URLS[app].api) {
          const apiPort = getPort(app, 'api')
          ports.add(apiPort)
        }
      })

      // 5 unique web ports + 5 API ports = 10 total
      expect(ports.size).toBe(10)
    })
  })
})
