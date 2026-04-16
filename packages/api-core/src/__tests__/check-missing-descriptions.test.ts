import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)
import { describe, expect, it, vi } from 'vitest'
import {
  checkMissingDescriptions,
  scanRegistriesForMissingDescriptions,
} from '../core/openapi/check-missing-descriptions.js'
import type { ServerLogger } from '../core/types.js'

function createLoggerSpy(): ServerLogger & { _calls: string[] } {
  const calls: string[] = []
  const logger: ServerLogger & { _calls: string[] } = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn((msg: string) => {
      calls.push(msg)
    }),
    _calls: calls,
  }
  return logger
}

describe('checkMissingDescriptions', () => {
  it('returns an empty array and does not log when every field has a description', () => {
    const schema = z.object({
      id: z.string().describe('Identifier'),
      name: z.string().describe('Display name'),
    })

    const logger = createLoggerSpy()
    const missing = checkMissingDescriptions(schema, 'User', logger)

    expect(missing).toEqual([])
    expect(logger.debug).not.toHaveBeenCalled()
  })

  it('lists every field without a description and logs once', () => {
    const schema = z.object({
      id: z.string().describe('Identifier'),
      name: z.string(),
      email: z.string(),
    })

    const logger = createLoggerSpy()
    const missing = checkMissingDescriptions(schema, 'User', logger)

    expect(missing).toEqual(['name', 'email'])
    expect(logger.debug).toHaveBeenCalledTimes(1)
    expect(logger._calls[0]).toContain('User')
    expect(logger._calls[0]).toContain('name')
    expect(logger._calls[0]).toContain('email')
  })

  it('stays silent when no logger is provided (silent default)', () => {
    const schema = z.object({ name: z.string() })
    // Must not throw even though the schema has missing descriptions.
    expect(() => checkMissingDescriptions(schema, 'User')).not.toThrow()
  })

  it('returns [] for non-object schemas', () => {
    const schema = z.string()
    const logger = createLoggerSpy()
    const missing = checkMissingDescriptions(schema, 'Scalar', logger)
    expect(missing).toEqual([])
    expect(logger.debug).not.toHaveBeenCalled()
  })
})

describe('scanRegistriesForMissingDescriptions', () => {
  it('walks every registered schema and reports the missing descriptions', () => {
    const registry = new OpenAPIRegistry()
    registry.register('UserOk', z.object({ id: z.string().describe('Identifier') }))
    registry.register(
      'UserMissing',
      z.object({ id: z.string(), email: z.string().describe('Email') })
    )

    const logger = createLoggerSpy()
    const report = scanRegistriesForMissingDescriptions([registry], logger)

    expect(report).toEqual({ UserMissing: ['id'] })
    expect(logger.debug).toHaveBeenCalledTimes(1)
    expect(logger._calls[0]).toContain('UserMissing')
  })
})
