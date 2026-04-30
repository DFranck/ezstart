/**
 * Tests for `attachDerivedMode` + `withRequestContextMiddleware`.
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { getRequestContext } from '../core/context/request-context.js'
import { attachDerivedMode, withRequestContextMiddleware } from '../core/middleware/derive-mode.js'

interface BuildOptions {
  user?: Record<string, unknown>
  apiKeyEnv?: 'test' | 'live'
}

function buildApp(opts: BuildOptions = {}) {
  const app = express()
  if (opts.user || opts.apiKeyEnv) {
    app.use((req, _res, next) => {
      if (opts.user) req.user = opts.user as typeof req.user
      if (opts.apiKeyEnv) {
        ;(req as typeof req & { apiKeyEnv?: string }).apiKeyEnv = opts.apiKeyEnv
      }
      next()
    })
  }
  app.use(attachDerivedMode)
  app.use(withRequestContextMiddleware)
  app.get('/mode', (req, res) => {
    const ctx = getRequestContext()
    res.json({
      derivedMode: req.derivedMode ?? null,
      ctxMode: ctx?.derivedMode ?? null,
    })
  })
  return app
}

describe('attachDerivedMode', () => {
  it('defaults to "live" when no key and no superadmin override is present', async () => {
    const app = buildApp()
    const res = await request(app).get('/mode')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedMode: 'live', ctxMode: 'live' })
  })

  it('detects "test" from `ez_pk_test_*` X-API-Key header', async () => {
    const app = buildApp()
    const res = await request(app).get('/mode').set('X-API-Key', 'ez_pk_test_abc123')
    expect(res.status).toBe(200)
    expect(res.body.derivedMode).toBe('test')
    expect(res.body.ctxMode).toBe('test')
  })

  it('detects "live" from `ez_pk_live_*` X-API-Key header', async () => {
    const app = buildApp()
    const res = await request(app).get('/mode').set('X-API-Key', 'ez_pk_live_xyz789')
    expect(res.status).toBe(200)
    expect(res.body.derivedMode).toBe('live')
  })

  it('detects "test" from `ez_sk_test_*` Authorization: ApiKey header', async () => {
    const app = buildApp()
    const res = await request(app).get('/mode').set('Authorization', 'ApiKey ez_sk_test_secret')
    expect(res.status).toBe(200)
    expect(res.body.derivedMode).toBe('test')
  })

  it('detects "live" from `ez_sk_live_*` Authorization: ApiKey header', async () => {
    const app = buildApp()
    const res = await request(app).get('/mode').set('Authorization', 'ApiKey ez_sk_live_secret')
    expect(res.status).toBe(200)
    expect(res.body.derivedMode).toBe('live')
  })

  it('prefers `req.apiKeyEnv` set by upstream auth middleware over header parsing', async () => {
    // Header says live, but upstream auth middleware says test → trust upstream.
    const app = buildApp({ apiKeyEnv: 'test' })
    const res = await request(app).get('/mode').set('X-API-Key', 'ez_pk_live_xyz')
    expect(res.body.derivedMode).toBe('test')
  })

  it('honours superadmin override via `?mode=test`', async () => {
    const app = buildApp({ user: { _id: 'u1', email: 'admin@x', globalRoles: ['superadmin'] } })
    const res = await request(app).get('/mode?mode=test')
    expect(res.body.derivedMode).toBe('test')
  })

  it('honours superadmin override via `?mode=live` even when key is test', async () => {
    const app = buildApp({
      user: { _id: 'u1', email: 'admin@x', globalRoles: ['superadmin'] },
    })
    const res = await request(app).get('/mode?mode=live').set('X-API-Key', 'ez_pk_test_abc')
    expect(res.body.derivedMode).toBe('live')
  })

  it('ignores superadmin override values that are not test/live', async () => {
    const app = buildApp({ user: { _id: 'u1', email: 'admin@x', globalRoles: ['superadmin'] } })
    const res = await request(app).get('/mode?mode=hax')
    expect(res.body.derivedMode).toBe('live')
  })

  it('ignores `?mode=` override for non-superadmin users (no privilege escalation)', async () => {
    const app = buildApp({ user: { _id: 'u1', email: 'a@x', appRoles: { ezbill: ['admin'] } } })
    const res = await request(app).get('/mode?mode=live').set('X-API-Key', 'ez_pk_test_abc')
    // Override IGNORED — caller's test key wins.
    expect(res.body.derivedMode).toBe('test')
  })

  it('ignores `?mode=` override for unauthenticated users', async () => {
    const app = buildApp()
    const res = await request(app).get('/mode?mode=test')
    // No user → not superadmin → override ignored → default 'live'.
    expect(res.body.derivedMode).toBe('live')
  })

  it('legacy ezk_* keys fall back to "live" (pre-test/live era)', async () => {
    const app = buildApp()
    const res = await request(app).get('/mode').set('X-API-Key', 'ezk_live_legacy123')
    expect(res.body.derivedMode).toBe('live')
  })

  it('propagates derivedMode through the AsyncLocalStorage frame', async () => {
    const app = buildApp()
    const res = await request(app).get('/mode').set('X-API-Key', 'ez_pk_test_async')
    expect(res.body.ctxMode).toBe('test')
  })
})

describe('withRequestContextMiddleware', () => {
  it('returns undefined when called outside a request frame', () => {
    expect(getRequestContext()).toBeUndefined()
  })

  it('exposes userId in the context frame', async () => {
    const app = express()
    app.use((req, _res, next) => {
      req.userId = 'user-42'
      next()
    })
    app.use(attachDerivedMode)
    app.use(withRequestContextMiddleware)
    app.get('/who', (_req, res) => {
      const ctx = getRequestContext()
      res.json({ userId: ctx?.userId ?? null })
    })
    const res = await request(app).get('/who')
    expect(res.body).toEqual({ userId: 'user-42' })
  })
})
