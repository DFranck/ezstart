/**
 * Tests for GET /api/keys/config?key=... — public rate-limited endpoint used
 * by pay-sdk to auto-resolve its config from a publishable key.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import type { Express } from 'express'
import { getApiKeyModel, type ApiKeyDocument } from '../../../models/api-key.js'
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../../../utils/api-key.js'
import type { Model } from 'mongoose'

// Import AFTER mocks (no middleware mock needed — route is public).
const configRouteMod = await import('../../../routes/api-keys/config.js')
const { _resetRateLimitForTests, _RATE_LIMIT_MAX } = configRouteMod

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/', configRouteMod.default)
  return app
}

interface ConfigResponse {
  status: number
  body: {
    success: boolean
    data?: {
      applicationId: string
      appSlug: string
      apiUrl: string
      webUrl: string
      type: 'publishable' | 'secret'
      env: 'live' | 'test'
      scope: 'admin' | 'user' | 'readonly'
    }
  }
}

async function getConfig(app: Express, keyParam?: string): Promise<ConfigResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') return reject(new Error('no address'))
      const port = address.port
      const suffix = keyParam !== undefined ? `?key=${encodeURIComponent(keyParam)}` : ''
      fetch(`http://127.0.0.1:${port}/keys/config${suffix}`)
        .then(async r => {
          const body = (await r.json()) as ConfigResponse['body']
          server.close()
          resolve({ status: r.status, body })
        })
        .catch(err => {
          server.close()
          reject(err)
        })
    })
  })
}

async function seedKey(ApiKey: Model<ApiKeyDocument>, overrides: Partial<ApiKeyDocument> = {}) {
  const rawKey = generateRawApiKey({ type: 'publishable', env: 'live' })
  const hashedKey = hashApiKey(rawKey)
  await ApiKey.create({
    key: hashedKey,
    keyPrefix: extractKeyPrefix(rawKey),
    name: 'k',
    userId: 'user-1',
    applicationId: 'app-1',
    appSlug: 'acme',
    type: 'publishable',
    env: 'live',
    scope: 'user',
    permissions: ['*'],
    status: 'active',
    ...overrides,
  })
  return rawKey
}

describe('GET /keys/config — public EZPay key config', () => {
  let app: Express
  let ApiKey: Model<ApiKeyDocument>

  beforeAll(async () => {
    await setupTestDatabase()
    app = createApp()
    ApiKey = await getApiKeyModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await ApiKey.deleteMany({})
    _resetRateLimitForTests()
  })

  it('returns config for a valid active key', async () => {
    const rawKey = await seedKey(ApiKey, {
      applicationId: 'app-xyz',
      appSlug: 'acme',
      scope: 'admin',
    })

    const res = await getConfig(app, rawKey)
    expect(res.status).toBe(200)
    expect(res.body.data?.applicationId).toBe('app-xyz')
    expect(res.body.data?.appSlug).toBe('acme')
    expect(res.body.data?.type).toBe('publishable')
    expect(res.body.data?.env).toBe('live')
    expect(res.body.data?.scope).toBe('admin')
    expect(typeof res.body.data?.apiUrl).toBe('string')
    expect(typeof res.body.data?.webUrl).toBe('string')
  })

  it('returns 400 when the key parameter is missing', async () => {
    const res = await getConfig(app)
    expect(res.status).toBe(400)
  })

  it('returns 401 for unknown keys', async () => {
    const res = await getConfig(app, 'ez_pk_live_nonexistent')
    expect(res.status).toBe(401)
  })

  it('returns 401 for revoked keys', async () => {
    const rawKey = await seedKey(ApiKey, { status: 'revoked', revokedAt: new Date() })
    const res = await getConfig(app, rawKey)
    expect(res.status).toBe(401)
  })

  it('returns 401 for expired keys', async () => {
    const rawKey = await seedKey(ApiKey, { expiresAt: new Date(Date.now() - 1000) })
    const res = await getConfig(app, rawKey)
    expect(res.status).toBe(401)
  })

  it('returns 429 after exceeding the per-key rate limit', async () => {
    const rawKey = await seedKey(ApiKey)
    const limit = _RATE_LIMIT_MAX

    // Spin up a single long-lived server — spinning one per request would be
    // too slow at 35+ iterations and race the event loop.
    const server = app.listen(0)
    await new Promise<void>(resolve => server.once('listening', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') {
      server.close()
      throw new Error('no address')
    }
    const port = address.port
    const url = `http://127.0.0.1:${port}/keys/config?key=${encodeURIComponent(rawKey)}`

    try {
      const statuses: number[] = []
      // Send limit + 5 requests back-to-back (sequential so we know the 31st
      // is the one that crosses the threshold).
      for (let i = 0; i < limit + 5; i++) {
        const r = await fetch(url)
        // Drain body to free the socket.
        await r.text()
        statuses.push(r.status)
      }

      // Sanity: first `limit` requests should be under-threshold (200).
      expect(statuses.slice(0, limit).every(s => s === 200)).toBe(true)
      // Every request past the threshold must be 429.
      const overflow = statuses.slice(limit)
      expect(overflow.length).toBe(5)
      expect(overflow.every(s => s === 429)).toBe(true)
    } finally {
      server.close()
    }
  })
})
