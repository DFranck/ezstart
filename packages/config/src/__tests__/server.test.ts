import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the two collaborators that `instrumentApi` orchestrates so we can
// verify wiring (call order + per-app slug propagation) without touching
// the filesystem or relying on a real MONGO_URL template.
vi.mock('../secrets-loader.js', () => ({
  loadSharedEnv: vi.fn(),
  maskedEnv: vi.fn(),
  findMonorepoRoot: vi.fn(),
}))

vi.mock('../env-resolvers.js', () => ({
  getMongoUrl: vi.fn((slug: string) => `mongodb+srv://test/${slug}`),
}))

import { instrumentApi } from '../server.js'
import { loadSharedEnv } from '../secrets-loader.js'
import { getMongoUrl } from '../env-resolvers.js'

describe('@ezstart/config/server - instrumentApi', () => {
  const originalMongo = process.env.MONGO_URL

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MONGO_URL
  })

  afterEach(() => {
    if (originalMongo === undefined) {
      delete process.env.MONGO_URL
    } else {
      process.env.MONGO_URL = originalMongo
    }
  })

  it('loads root + per-app env layers for the given slug', () => {
    instrumentApi('ezauth')

    expect(loadSharedEnv).toHaveBeenCalledTimes(1)
    expect(loadSharedEnv).toHaveBeenCalledWith({ app: 'ezauth', layer: 'api' })
  })

  it('writes the resolved MONGO_URL back to process.env', () => {
    instrumentApi('ezpay')

    expect(getMongoUrl).toHaveBeenCalledWith('ezpay')
    expect(process.env.MONGO_URL).toBe('mongodb+srv://test/ezpay')
  })

  it('propagates a different slug correctly (kebab-case preserved)', () => {
    instrumentApi('green-pulse')

    expect(loadSharedEnv).toHaveBeenCalledWith({ app: 'green-pulse', layer: 'api' })
    expect(getMongoUrl).toHaveBeenCalledWith('green-pulse')
    expect(process.env.MONGO_URL).toBe('mongodb+srv://test/green-pulse')
  })

  it('runs loadSharedEnv BEFORE getMongoUrl (env must be loaded first)', () => {
    const order: string[] = []
    vi.mocked(loadSharedEnv).mockImplementationOnce(() => {
      order.push('loadSharedEnv')
    })
    vi.mocked(getMongoUrl).mockImplementationOnce(slug => {
      order.push('getMongoUrl')
      return `mongodb+srv://test/${slug}`
    })

    instrumentApi('ezbill')

    expect(order).toEqual(['loadSharedEnv', 'getMongoUrl'])
  })
})
