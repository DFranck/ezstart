/**
 * Tests for `createTenantScopeMiddleware`.
 *
 * Covers the 3 sources (`apiKey` / `body` / `param`), the ownership
 * verification policy, superadmin bypass, error envelopes, and the
 * `req.applicationId` augmentation set on success.
 *
 * @module @ezstart/api-core/__tests__/middleware/tenant-scope
 */

import express, { type Express, type Request, type Response } from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTenantScopeMiddleware,
  type TenantApplicationLoader,
  type TenantApplicationShape,
  type TenantScopeOptions,
} from '../../core/middleware/tenant-scope.js'

interface BuildAppOptions {
  middlewareConfig: TenantScopeOptions
  /** Optional pre-middleware that mutates `req` (simulate auth, attach apiKeyApplicationId, etc.). */
  prelude?: (req: Request, res: Response, next: () => void) => void
  /** Route path. Default `/protected`. */
  path?: string
  /** Custom param name on the route (for source: 'param' tests). */
  paramSegment?: string
}

function buildApp(opts: BuildAppOptions): Express {
  const app = express()
  app.use(express.json())
  if (opts.prelude) {
    app.use(opts.prelude)
  }
  const middleware = createTenantScopeMiddleware(opts.middlewareConfig)
  const path = opts.paramSegment ? `/protected/:${opts.paramSegment}` : (opts.path ?? '/protected')
  app.post(path, middleware, (req, res) => {
    res.json({ ok: true, applicationId: req.applicationId })
  })
  return app
}

const APP_OWNED_BY_ALICE: TenantApplicationShape = {
  id: 'app_alice_1',
  ownerId: 'user_alice',
  appName: 'alice-app',
}

const APP_OWNED_BY_BOB: TenantApplicationShape = {
  id: 'app_bob_1',
  ownerId: 'user_bob',
  appName: 'bob-app',
}

function makeLoader(applications: TenantApplicationShape[]): TenantApplicationLoader {
  return vi.fn(async (id: string) => applications.find(a => a.id === id) ?? null)
}

describe('createTenantScopeMiddleware', () => {
  describe('config validation (fail-fast)', () => {
    it('throws when source=body and no applicationLoader is provided', () => {
      expect(() => createTenantScopeMiddleware({ source: 'body' })).toThrow(
        /source='body' requires an applicationLoader/
      )
    })

    it('throws when source=param and no applicationLoader is provided', () => {
      expect(() => createTenantScopeMiddleware({ source: 'param' })).toThrow(
        /source='param' requires an applicationLoader/
      )
    })

    it('does NOT throw when source=apiKey without an applicationLoader', () => {
      expect(() => createTenantScopeMiddleware({ source: 'apiKey' })).not.toThrow()
    })
  })

  describe('source: apiKey', () => {
    it('passes through req.apiKeyApplicationId without DB call', async () => {
      const loader = makeLoader([])
      const app = buildApp({
        middlewareConfig: { source: 'apiKey', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.apiKeyApplicationId = 'app_from_key_42'
          next()
        },
      })
      const res = await request(app).post('/protected').send({})
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, applicationId: 'app_from_key_42' })
      expect(loader).not.toHaveBeenCalled()
    })

    it('rejects 400 + APPLICATION_NOT_FOUND if req.apiKeyApplicationId is missing', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'apiKey' },
      })
      const res = await request(app).post('/protected').send({})
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND')
      expect(res.body.error.message).toBe('applicationId is required')
    })

    it('rejects 400 if req.apiKeyApplicationId is an empty string', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'apiKey' },
        prelude: (req, _res, next) => {
          req.apiKeyApplicationId = ''
          next()
        },
      })
      const res = await request(app).post('/protected').send({})
      expect(res.status).toBe(400)
    })

    it('does NOT call applicationLoader even when one is provided', async () => {
      const loader = makeLoader([APP_OWNED_BY_ALICE])
      const app = buildApp({
        middlewareConfig: {
          source: 'apiKey',
          applicationLoader: loader,
          verifyOwnership: true, // Should be ignored for apiKey source
        },
        prelude: (req, _res, next) => {
          req.apiKeyApplicationId = 'app_alice_1'
          // No req.userId attached — would normally fail ownership, but apiKey path skips it.
          next()
        },
      })
      const res = await request(app).post('/protected').send({})
      expect(res.status).toBe(200)
      expect(loader).not.toHaveBeenCalled()
    })
  })

  describe('source: body', () => {
    let loader: ReturnType<typeof makeLoader>

    beforeEach(() => {
      loader = makeLoader([APP_OWNED_BY_ALICE, APP_OWNED_BY_BOB])
    })

    it('resolves applicationId from req.body.applicationId by default', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(200)
      expect(res.body.applicationId).toBe('app_alice_1')
      expect(loader).toHaveBeenCalledWith('app_alice_1')
    })

    it('uses custom bodyField when provided', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', bodyField: 'tenantId', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({ tenantId: 'app_alice_1' })
      expect(res.status).toBe(200)
      expect(loader).toHaveBeenCalledWith('app_alice_1')
    })

    it('rejects 400 + APPLICATION_NOT_FOUND if missing from body', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({})
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND')
      expect(loader).not.toHaveBeenCalled()
    })

    it('rejects 404 + APPLICATION_NOT_FOUND when loader returns null', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app)
        .post('/protected')
        .send({ applicationId: 'app_does_not_exist' })
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND')
      expect(res.body.error.message).toBe('Application not found')
    })

    it('rejects 403 + APPLICATION_ACCESS_DENIED if ownerId !== userId', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice' // owns app_alice_1
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_bob_1' })
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('APPLICATION_ACCESS_DENIED')
      expect(res.body.error.message).toBe('You do not have access to this Application')
    })

    it('accepts when ownerId === req.userId', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(200)
      expect(res.body.applicationId).toBe('app_alice_1')
    })

    it('rejects 403 when userId is absent (anonymous request)', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        // No prelude — no req.userId.
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('APPLICATION_ACCESS_DENIED')
    })

    it('rejects 400 when body.applicationId is an empty string', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: '' })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND')
    })
  })

  describe('source: param', () => {
    let loader: ReturnType<typeof makeLoader>

    beforeEach(() => {
      loader = makeLoader([APP_OWNED_BY_ALICE])
    })

    it('resolves applicationId from req.params.applicationId by default', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'param', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
        paramSegment: 'applicationId',
      })
      const res = await request(app).post('/protected/app_alice_1').send({})
      expect(res.status).toBe(200)
      expect(res.body.applicationId).toBe('app_alice_1')
      expect(loader).toHaveBeenCalledWith('app_alice_1')
    })

    it('uses custom paramName', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'param', paramName: 'appId', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
        paramSegment: 'appId',
      })
      const res = await request(app).post('/protected/app_alice_1').send({})
      expect(res.status).toBe(200)
    })

    it('rejects 403 + APPLICATION_ACCESS_DENIED when ownership fails (route param case)', async () => {
      const loaderWithBoth = makeLoader([APP_OWNED_BY_ALICE, APP_OWNED_BY_BOB])
      const app = buildApp({
        middlewareConfig: { source: 'param', applicationLoader: loaderWithBoth },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
        paramSegment: 'applicationId',
      })
      const res = await request(app).post('/protected/app_bob_1').send({})
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('APPLICATION_ACCESS_DENIED')
    })
  })

  describe('superadmin bypass', () => {
    let loader: ReturnType<typeof makeLoader>

    beforeEach(() => {
      loader = makeLoader([APP_OWNED_BY_ALICE, APP_OWNED_BY_BOB])
    })

    it('allows superadmin to access an Application owned by another user', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_charlie'
          req.user = { userId: 'user_charlie', globalRoles: ['superadmin'] }
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(200)
      expect(res.body.applicationId).toBe('app_alice_1')
    })

    it('blocks non-superadmin in the same scenario', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_charlie'
          req.user = { userId: 'user_charlie', globalRoles: ['admin', 'viewer'] }
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('APPLICATION_ACCESS_DENIED')
    })

    it('respects allowSuperadmin: false (superadmin gets denied)', async () => {
      const app = buildApp({
        middlewareConfig: {
          source: 'body',
          applicationLoader: loader,
          allowSuperadmin: false,
        },
        prelude: (req, _res, next) => {
          req.userId = 'user_charlie'
          req.user = { userId: 'user_charlie', globalRoles: ['superadmin'] }
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('APPLICATION_ACCESS_DENIED')
    })

    it('treats missing globalRoles as non-superadmin (no NPE)', async () => {
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_charlie'
          req.user = { userId: 'user_charlie' } // no globalRoles
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(403)
    })
  })

  describe('verifyOwnership: false', () => {
    it('still loads Application (to verify existence) but skips ownership check', async () => {
      const loader = makeLoader([APP_OWNED_BY_BOB])
      const app = buildApp({
        middlewareConfig: {
          source: 'body',
          applicationLoader: loader,
          verifyOwnership: false,
        },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice' // NOT the owner of app_bob_1
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_bob_1' })
      expect(res.status).toBe(200)
      expect(res.body.applicationId).toBe('app_bob_1')
      expect(loader).toHaveBeenCalledWith('app_bob_1')
    })

    it('still returns 404 if loader returns null (existence is enforced)', async () => {
      const loader = makeLoader([])
      const app = buildApp({
        middlewareConfig: {
          source: 'body',
          applicationLoader: loader,
          verifyOwnership: false,
        },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_ghost' })
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND')
    })
  })

  describe('error handling', () => {
    it('returns 500 + INTERNAL_ERROR if applicationLoader throws', async () => {
      const loader = vi.fn(async () => {
        throw new Error('DB blew up')
      })
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe('INTERNAL_ERROR')
      expect(res.body.error.message).toBe('Failed to resolve Application')
    })

    it('logs warn on denied access when logger is provided', async () => {
      const loader = makeLoader([APP_OWNED_BY_BOB])
      const logger = { warn: vi.fn() }
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader, logger },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_bob_1' })
      expect(res.status).toBe(403)
      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(logger.warn).toHaveBeenCalledWith('Tenant scope denied', {
        applicationId: 'app_bob_1',
        userId: 'user_alice',
        ownerId: 'user_bob',
        appName: 'bob-app',
      })
    })

    it('does NOT log on success', async () => {
      const loader = makeLoader([APP_OWNED_BY_ALICE])
      const logger = { warn: vi.fn() }
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader, logger },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      const res = await request(app).post('/protected').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(200)
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('does NOT log when no logger is provided (silent default)', async () => {
      const loader = makeLoader([APP_OWNED_BY_BOB])
      const app = buildApp({
        middlewareConfig: { source: 'body', applicationLoader: loader },
        prelude: (req, _res, next) => {
          req.userId = 'user_alice'
          next()
        },
      })
      // Should not crash, response is still 403.
      const res = await request(app).post('/protected').send({ applicationId: 'app_bob_1' })
      expect(res.status).toBe(403)
    })
  })

  describe('type augmentation', () => {
    it('sets req.applicationId on success (next handler can read it)', async () => {
      const loader = makeLoader([APP_OWNED_BY_ALICE])
      const app = express()
      app.use(express.json())
      app.use((req, _res, next) => {
        req.userId = 'user_alice'
        next()
      })
      const middleware = createTenantScopeMiddleware({
        source: 'body',
        applicationLoader: loader,
      })
      // Two-stage to prove the value is observable from a downstream handler.
      app.post('/two-stage', middleware, (req, res) => {
        // Echo just the augmented field so the test asserts on the augmentation,
        // not on the loader return value.
        res.json({ resolvedFromReq: req.applicationId })
      })
      const res = await request(app).post('/two-stage').send({ applicationId: 'app_alice_1' })
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ resolvedFromReq: 'app_alice_1' })
    })

    it('does NOT set req.applicationId on failure', async () => {
      const loader = makeLoader([])
      const seen: { applicationId: string | undefined } = { applicationId: undefined }
      const app = express()
      app.use(express.json())
      app.use((req, _res, next) => {
        req.userId = 'user_alice'
        next()
      })
      const middleware = createTenantScopeMiddleware({
        source: 'body',
        applicationLoader: loader,
      })
      app.post('/should-not-reach', middleware, (req, res) => {
        seen.applicationId = req.applicationId
        res.json({ ok: true })
      })
      const res = await request(app).post('/should-not-reach').send({ applicationId: 'app_ghost' })
      expect(res.status).toBe(404)
      expect(seen.applicationId).toBeUndefined()
    })
  })
})
