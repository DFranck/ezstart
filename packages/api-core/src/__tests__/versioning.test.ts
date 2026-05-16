/**
 * Tests for API versioning primitives.
 */

import request from 'supertest'
import express from 'express'
import { describe, expect, it } from 'vitest'
import {
  createVersionedRouter,
  addVersionHeader,
  extractVersionFromPath,
} from '../core/versioning.js'

describe('createVersionedRouter', () => {
  it('mounts the router at both basePath and basePath/v1 by default', async () => {
    const app = express()
    const api = express.Router()
    api.get('/users', (_req, res) => res.json({ ok: true }))

    app.use(createVersionedRouter('/api', api))

    const base = await request(app).get('/api/users')
    expect(base.status).toBe(200)
    expect(base.body).toEqual({ ok: true })

    const versioned = await request(app).get('/api/v1/users')
    expect(versioned.status).toBe(200)
    expect(versioned.body).toEqual({ ok: true })
  })

  it('supports a custom version string', async () => {
    const app = express()
    const api = express.Router()
    api.get('/items', (_req, res) => res.json({ items: [] }))

    app.use(createVersionedRouter('/api', api, 'v2'))

    const versioned = await request(app).get('/api/v2/items')
    expect(versioned.status).toBe(200)
    expect(versioned.body).toEqual({ items: [] })
  })

  it('returns 404 for non-matching version prefix', async () => {
    const app = express()
    const api = express.Router()
    api.get('/data', (_req, res) => res.json({ data: 1 }))

    app.use(createVersionedRouter('/api', api, 'v1'))

    const res = await request(app).get('/api/v99/data')
    expect(res.status).toBe(404)
  })

  // ─── Wave B Lot 4 (M1) — Double-prefix guard ───
  describe('M1 — Double-prefix guard /api/v1/v1/<route>', () => {
    it('returns 404 on /api/v1/v1/users (rejects double-prefix alias)', async () => {
      const app = express()
      const api = express.Router()
      api.get('/users', (_req, res) => res.json({ ok: true }))

      app.use(createVersionedRouter('/api', api))

      const res = await request(app).get('/api/v1/v1/users')
      expect(res.status).toBe(404)
      expect(res.body).toMatchObject({
        success: false,
        error: { code: 'NOT_FOUND' },
      })
    })

    it('returns 404 on /api/v1/v1/<any path>', async () => {
      const app = express()
      const api = express.Router()
      api.get('/users', (_req, res) => res.json({ ok: true }))
      api.get('/items', (_req, res) => res.json({ ok: true }))

      app.use(createVersionedRouter('/api', api))

      const res1 = await request(app).get('/api/v1/v1/users')
      expect(res1.status).toBe(404)
      const res2 = await request(app).get('/api/v1/v1/items')
      expect(res2.status).toBe(404)
      const res3 = await request(app).get('/api/v1/v1/anything')
      expect(res3.status).toBe(404)
    })

    it('still serves /api/v1/users normally (canonical versioned mount)', async () => {
      const app = express()
      const api = express.Router()
      api.get('/users', (_req, res) => res.json({ ok: true, source: 'versioned' }))

      app.use(createVersionedRouter('/api', api))

      const res = await request(app).get('/api/v1/users')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, source: 'versioned' })
    })

    it('still serves /api/users normally (legacy mount)', async () => {
      const app = express()
      const api = express.Router()
      api.get('/users', (_req, res) => res.json({ ok: true, source: 'legacy' }))

      app.use(createVersionedRouter('/api', api))

      const res = await request(app).get('/api/users')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, source: 'legacy' })
    })

    it('guards a custom currentVersion (e.g. v2) the same way', async () => {
      const app = express()
      const api = express.Router()
      api.get('/items', (_req, res) => res.json({ items: [] }))

      app.use(createVersionedRouter('/api', api, 'v2'))

      const doublePrefix = await request(app).get('/api/v2/v2/items')
      expect(doublePrefix.status).toBe(404)

      const canonical = await request(app).get('/api/v2/items')
      expect(canonical.status).toBe(200)

      const legacy = await request(app).get('/api/items')
      expect(legacy.status).toBe(200)
    })
  })
})

describe('addVersionHeader', () => {
  it('sets API-Version and X-API-Version headers with default v1', async () => {
    const app = express()
    app.use(addVersionHeader())
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/test')
    expect(res.headers['api-version']).toBe('v1')
    expect(res.headers['x-api-version']).toBe('v1')
  })

  it('sets custom version in headers', async () => {
    const app = express()
    app.use(addVersionHeader('v3'))
    app.get('/test', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/test')
    expect(res.headers['api-version']).toBe('v3')
    expect(res.headers['x-api-version']).toBe('v3')
  })
})

describe('extractVersionFromPath', () => {
  it('extracts version from /v2/ in the path', async () => {
    const app = express()
    app.use(extractVersionFromPath())
    app.get('/api/v2/users', (req, res) => {
      res.json({ version: (req as typeof req & { apiVersion: string }).apiVersion })
    })

    const res = await request(app).get('/api/v2/users')
    expect(res.status).toBe(200)
    expect(res.body.version).toBe('v2')
  })

  it('defaults to v1 when no version segment is present', async () => {
    const app = express()
    app.use(extractVersionFromPath())
    app.get('/api/users', (req, res) => {
      res.json({ version: (req as typeof req & { apiVersion: string }).apiVersion })
    })

    const res = await request(app).get('/api/users')
    expect(res.status).toBe(200)
    expect(res.body.version).toBe('v1')
  })

  it('extracts multi-digit versions like v12', async () => {
    const app = express()
    app.use(extractVersionFromPath())
    app.get('/api/v12/data', (req, res) => {
      res.json({ version: (req as typeof req & { apiVersion: string }).apiVersion })
    })

    const res = await request(app).get('/api/v12/data')
    expect(res.status).toBe(200)
    expect(res.body.version).toBe('v12')
  })
})
