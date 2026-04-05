import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getApiPort } from '../config/ports.js'

describe('@ezstart/express-core - Ports', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getApiPort', () => {
    it('should return port from @ezstart/config for ezauth', () => {
      delete process.env.PORT

      const port = getApiPort('ezauth')

      expect(port).toBe(6110)
    })

    it('should return port from @ezstart/config for ezpay', () => {
      delete process.env.PORT

      const port = getApiPort('ezpay')

      expect(port).toBe(6130)
    })

    it('should return port from @ezstart/config for ezbill', () => {
      delete process.env.PORT

      const port = getApiPort('ezbill')

      expect(port).toBe(6120)
    })

    it('should return port from @ezstart/config for green-pulse', () => {
      delete process.env.PORT

      const port = getApiPort('green-pulse')

      expect(port).toBe(6160)
    })

    it('should return port from @ezstart/config for ezstart', () => {
      delete process.env.PORT

      const port = getApiPort('ezstart')

      expect(port).toBe(6100)
    })

    it('should override with PORT env var if provided', () => {
      process.env.PORT = '9999'

      const port = getApiPort('ezauth')

      expect(port).toBe(9999)
    })

    it('should prioritize PORT env var over config', () => {
      process.env.PORT = '8000'

      const port1 = getApiPort('ezauth')
      const port2 = getApiPort('ezpay')

      expect(port1).toBe(8000)
      expect(port2).toBe(8000)
    })

    it('should throw error for apps without API', () => {
      delete process.env.PORT

      expect(() => getApiPort('fengshui')).toThrow()
      expect(() => getApiPort('asc-tcd')).toThrow()
    })

    it('should return number type', () => {
      delete process.env.PORT

      const port = getApiPort('ezauth')

      expect(typeof port).toBe('number')
    })

    it('should handle PORT as string and parse to number', () => {
      process.env.PORT = '5555'

      const port = getApiPort('ezauth')

      expect(port).toBe(5555)
      expect(typeof port).toBe('number')
    })
  })

  describe('Port consistency', () => {
    it('should return same port for same app', () => {
      delete process.env.PORT

      const port1 = getApiPort('ezauth')
      const port2 = getApiPort('ezauth')

      expect(port1).toBe(port2)
    })

    it('should return different ports for different apps', () => {
      delete process.env.PORT

      const portEzauth = getApiPort('ezauth')
      const portEzpay = getApiPort('ezpay')
      const portEzbill = getApiPort('ezbill')

      expect(portEzauth).not.toBe(portEzpay)
      expect(portEzpay).not.toBe(portEzbill)
      expect(portEzauth).not.toBe(portEzbill)
    })
  })
})
