/**
 * Tests for role-based access control middleware.
 */

import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createBaseApiServer } from '../core/create-server.js'
import { createRoleMiddleware } from '../core/middleware/auth.js'

function buildApp(user?: Record<string, unknown>) {
  const { app } = createBaseApiServer({ port: 0, serviceName: 'roletest' })
  const { requireAdmin, requireRole } = createRoleMiddleware()

  // Simulate auth middleware by attaching user to req
  if (user) {
    app.use((req, _res, next) => {
      req.userId = user.userId as string
      req.user = user as typeof req.user
      next()
    })
  }

  app.get('/admin', requireAdmin, (_req, res) => res.json({ ok: true }))
  app.get('/editor', requireRole('editor'), (_req, res) => res.json({ ok: true }))
  return app
}

describe('createRoleMiddleware', () => {
  describe('requireAdmin', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const app = buildApp()
      const res = await request(app).get('/admin')
      expect(res.status).toBe(401)
    })

    it('rejects users without admin role with 403', async () => {
      const app = buildApp({ userId: 'u1', globalRoles: ['viewer'] })
      const res = await request(app).get('/admin')
      expect(res.status).toBe(403)
      expect(res.body.error.message).toBe('Admin access required')
    })

    it('allows users with globalRoles admin', async () => {
      const app = buildApp({ userId: 'u1', globalRoles: ['admin'] })
      const res = await request(app).get('/admin')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    })

    it('allows users with globalRoles superadmin', async () => {
      const app = buildApp({ userId: 'u1', globalRoles: ['superadmin'] })
      const res = await request(app).get('/admin')
      expect(res.status).toBe(200)
    })

    it('allows users with appRoles containing admin', async () => {
      const app = buildApp({ userId: 'u1', appRoles: { myapp: ['admin'] } })
      const res = await request(app).get('/admin')
      expect(res.status).toBe(200)
    })
  })

  describe('requireRole', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const app = buildApp()
      const res = await request(app).get('/editor')
      expect(res.status).toBe(401)
    })

    it('rejects users without the required role with 403', async () => {
      const app = buildApp({ userId: 'u1', globalRoles: ['viewer'] })
      const res = await request(app).get('/editor')
      expect(res.status).toBe(403)
      expect(res.body.error.message).toBe("Role 'editor' required")
    })

    it('allows users with the required role in globalRoles', async () => {
      const app = buildApp({ userId: 'u1', globalRoles: ['editor'] })
      const res = await request(app).get('/editor')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    })

    it('allows users with the required role in appRoles', async () => {
      const app = buildApp({ userId: 'u1', appRoles: { someapp: ['editor'] } })
      const res = await request(app).get('/editor')
      expect(res.status).toBe(200)
    })
  })
})
