/**
 * Tests for `createUnifiedAuthMiddleware` — accepts JWT cookie/Bearer OR API
 * key with scope-aware policy enforcement.
 */

import express, { type Request, type Response } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createBaseApiServer } from '../../core/create-server.js'
import {
  createUnifiedAuthMiddleware,
  type UnifiedApiKeyResult,
  type UnifiedAuthScope,
  type UnifiedJwtResult,
} from '../../core/middleware/unified-auth.js'

type StubBehaviour = {
  jwt?: 'absent' | 'ok' | 'invalid' | 'invalid-already-responded' | 'throws'
  apiKey?:
    | 'absent'
    | { scope: UnifiedAuthScope }
    | 'invalid'
    | 'invalid-already-responded'
    | 'throws'
}

function buildAppWithStubs(behaviour: StubBehaviour, requiredScope?: UnifiedAuthScope) {
  const { app } = createBaseApiServer({ port: 0, serviceName: 'unified-auth-test' })

  const authJwtOrKey = createUnifiedAuthMiddleware({
    requireKeyScope: requiredScope,
    verifyJwt: async (req: Request, res: Response): Promise<UnifiedJwtResult> => {
      switch (behaviour.jwt) {
        case 'absent':
        case undefined:
          return null
        case 'ok':
          req.user = { userId: 'jwt-user', _id: 'jwt-user' }
          req.userId = 'jwt-user'
          return { ok: true }
        case 'invalid':
          return { ok: false, responded: false }
        case 'invalid-already-responded':
          res.status(401).json({ success: false, error: { message: 'expired (verifier-emitted)' } })
          return { ok: false, responded: true }
        case 'throws':
          throw new Error('boom — JWT verifier crashed')
      }
    },
    verifyApiKey: async (req: Request, res: Response): Promise<UnifiedApiKeyResult> => {
      const k = behaviour.apiKey
      if (k === 'absent' || k === undefined) return null
      if (k === 'invalid') return { ok: false, responded: false }
      if (k === 'invalid-already-responded') {
        res.status(401).json({ success: false, error: { message: 'revoked (verifier-emitted)' } })
        return { ok: false, responded: true }
      }
      if (k === 'throws') throw new Error('boom — API key verifier crashed')
      // ok
      req.user = { userId: 'apikey-user', _id: 'apikey-user' }
      req.userId = 'apikey-user'
      req.apiKeyId = 'key-id-123'
      req.apiKeyScope = k.scope
      return { ok: true, scope: k.scope }
    },
  })

  app.get('/protected', authJwtOrKey, (req, res) => {
    res.json({
      ok: true,
      userId: req.userId,
      apiKeyId: req.apiKeyId ?? null,
      apiKeyScope: req.apiKeyScope ?? null,
    })
  })
  return app
}

describe('createUnifiedAuthMiddleware', () => {
  describe('JWT path', () => {
    it('passes through when JWT verifier reports ok', async () => {
      const app = buildAppWithStubs({ jwt: 'ok' })
      const res = await request(app).get('/protected')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        ok: true,
        userId: 'jwt-user',
        apiKeyId: null,
        apiKeyScope: null,
      })
    })

    it('does NOT fall back to the API key path when JWT was present but invalid', async () => {
      // Even if a valid API key is also attached, an invalid JWT must short-
      // circuit (otherwise an attacker could pass an expired JWT and a
      // working API key and we would mask the JWT failure).
      const app = buildAppWithStubs({ jwt: 'invalid', apiKey: { scope: 'admin' } })
      const res = await request(app).get('/protected')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('INVALID_TOKEN')
    })

    it('honours the verifier-emitted response when JWT is invalid and already responded', async () => {
      const app = buildAppWithStubs({ jwt: 'invalid-already-responded' })
      const res = await request(app).get('/protected')
      expect(res.status).toBe(401)
      expect(res.body.error.message).toContain('verifier-emitted')
    })

    it('returns 500 when the JWT verifier throws', async () => {
      const app = buildAppWithStubs({ jwt: 'throws' })
      const res = await request(app).get('/protected')
      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe('AUTH_INTERNAL_ERROR')
    })
  })

  describe('API key path', () => {
    it('passes through when JWT is absent and API key is valid with required scope', async () => {
      const app = buildAppWithStubs({ apiKey: { scope: 'admin' } }, 'admin')
      const res = await request(app).get('/protected')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        ok: true,
        userId: 'apikey-user',
        apiKeyId: 'key-id-123',
        apiKeyScope: 'admin',
      })
    })

    it('rejects API key with insufficient scope (admin required, user provided)', async () => {
      const app = buildAppWithStubs({ apiKey: { scope: 'user' } }, 'admin')
      const res = await request(app).get('/protected')
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('INSUFFICIENT_SCOPE')
    })

    it('rejects API key with insufficient scope (user required, readonly provided)', async () => {
      const app = buildAppWithStubs({ apiKey: { scope: 'readonly' } }, 'user')
      const res = await request(app).get('/protected')
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('INSUFFICIENT_SCOPE')
    })

    it('accepts admin scope for a route that only requires user', async () => {
      const app = buildAppWithStubs({ apiKey: { scope: 'admin' } }, 'user')
      const res = await request(app).get('/protected')
      expect(res.status).toBe(200)
    })

    it('returns 401 when API key verifier fails silently (no auth)', async () => {
      const app = buildAppWithStubs({ apiKey: 'invalid' }, 'user')
      const res = await request(app).get('/protected')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('INVALID_API_KEY')
    })

    it('honours the verifier-emitted response when API key is invalid and already responded', async () => {
      const app = buildAppWithStubs({ apiKey: 'invalid-already-responded' })
      const res = await request(app).get('/protected')
      expect(res.status).toBe(401)
      expect(res.body.error.message).toContain('verifier-emitted')
    })

    it('returns 500 when the API key verifier throws', async () => {
      const app = buildAppWithStubs({ apiKey: 'throws' })
      const res = await request(app).get('/protected')
      expect(res.status).toBe(500)
      expect(res.body.error.code).toBe('AUTH_INTERNAL_ERROR')
    })
  })

  describe('No credentials', () => {
    it('returns 401 when neither JWT nor API key is present', async () => {
      const app = buildAppWithStubs({})
      const res = await request(app).get('/protected')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Defaults', () => {
    it("defaults requireKeyScope to 'user' (admin scope satisfies)", async () => {
      const app = buildAppWithStubs({ apiKey: { scope: 'admin' } })
      const res = await request(app).get('/protected')
      expect(res.status).toBe(200)
    })

    it("defaults requireKeyScope to 'user' (readonly does NOT satisfy)", async () => {
      const app = buildAppWithStubs({ apiKey: { scope: 'readonly' } })
      const res = await request(app).get('/protected')
      expect(res.status).toBe(403)
    })
  })
})
