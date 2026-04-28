/**
 * Tests for the `attachDerivedScope` middleware.
 */

import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { attachDerivedScope } from '../core/middleware/derive-scope.js'

function buildApp(user?: Record<string, unknown>) {
  const app = express()
  if (user) {
    app.use((req, _res, next) => {
      req.userId = user.userId as string
      req.user = user as typeof req.user
      next()
    })
  }
  app.get('/scope', attachDerivedScope, (req, res) => {
    res.json({ derivedScope: req.derivedScope ?? null })
  })
  return app
}

describe('attachDerivedScope', () => {
  it('falls back to "mine" when no user is attached (anonymous request)', async () => {
    const app = buildApp()
    const res = await request(app).get('/scope')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'mine' })
  })

  it('returns "all" for users with the superadmin global role', async () => {
    const app = buildApp({ userId: 'u1', globalRoles: ['superadmin'] })
    const res = await request(app).get('/scope')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'all' })
  })

  it('returns "myApps" for users with an app-level admin role', async () => {
    const app = buildApp({ userId: 'u1', appRoles: { ezbill: ['admin'] } })
    const res = await request(app).get('/scope')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'myApps' })
  })

  it('returns "myApps" for users with the global admin role (non-superadmin)', async () => {
    const app = buildApp({ userId: 'u1', globalRoles: ['admin'] })
    const res = await request(app).get('/scope')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'myApps' })
  })

  it('returns "mine" for regular authenticated users (no admin role)', async () => {
    const app = buildApp({ userId: 'u1', globalRoles: ['viewer'] })
    const res = await request(app).get('/scope')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'mine' })
  })

  it('returns "mine" when user has empty role arrays', async () => {
    const app = buildApp({ userId: 'u1', globalRoles: [], appRoles: {} })
    const res = await request(app).get('/scope')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'mine' })
  })

  it('honours superadmin override via ?scope=mine', async () => {
    const app = buildApp({ userId: 'u1', globalRoles: ['superadmin'] })
    const res = await request(app).get('/scope?scope=mine')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'mine' })
  })

  it('honours superadmin override via ?scope=myApps', async () => {
    const app = buildApp({ userId: 'u1', globalRoles: ['superadmin'] })
    const res = await request(app).get('/scope?scope=myApps')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'myApps' })
  })

  it('ignores invalid override values', async () => {
    const app = buildApp({ userId: 'u1', globalRoles: ['superadmin'] })
    const res = await request(app).get('/scope?scope=hax')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'all' })
  })

  it('ignores override for non-superadmin users (no privilege escalation)', async () => {
    const app = buildApp({ userId: 'u1', appRoles: { ezbill: ['admin'] } })
    const res = await request(app).get('/scope?scope=all')
    expect(res.status).toBe(200)
    // Override IS NOT applied — caller stays on derived "myApps"
    expect(res.body).toEqual({ derivedScope: 'myApps' })
  })

  it('ignores override for regular users', async () => {
    const app = buildApp({ userId: 'u1', globalRoles: ['viewer'] })
    const res = await request(app).get('/scope?scope=all')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ derivedScope: 'mine' })
  })
})
