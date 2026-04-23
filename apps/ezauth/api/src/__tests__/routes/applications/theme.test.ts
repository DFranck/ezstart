/**
 * Integration tests for the white-label theme feature:
 * - `PATCH /api/applications/:id/theme` — owner/superadmin update
 * - `GET  /api/keys/config` — returns theme tokens only when enabled
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { applicationRouters } from '../../../routes/applications/index.js'
import configRouter, { __resetKeyConfigCache } from '../../../routes/api-keys/config.js'
import { getApplicationModel } from '../../../models/application.js'
import {
  createUser,
  createAdminUser,
  createApiKey,
  generateAccessToken,
  cleanAllCollections,
} from '../../helpers/setup.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  applicationRouters.forEach(r => app.use('/api', r))
  app.use('/api', configRouter)
  return app
}

describe('Application white-label theme', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createTestApp()
    const Application = await getApplicationModel()
    try {
      await Application.collection.dropIndexes()
    } catch {
      // ignore
    }
    await Application.createIndexes()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    const Application = await getApplicationModel()
    await Application.deleteMany({})
    __resetKeyConfigCache()
  })

  describe('PATCH /api/applications/:id/theme', () => {
    it('owner can set theme + themeEnabled', async () => {
      const user = await createUser({ email: 'o@test.com', username: 'o' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${appDoc._id.toString()}/theme`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          theme: { primary: '#00D9F7', background: 'oklch(1 0 0)' },
          themeEnabled: true,
        })

      expect(res.status).toBe(200)
      expect(res.body.data.theme).toEqual({
        primary: '#00D9F7',
        background: 'oklch(1 0 0)',
      })
      expect(res.body.data.themeEnabled).toBe(true)
    })

    it('rejects unsafe CSS color strings', async () => {
      const user = await createUser({ email: 'o@test.com', username: 'o' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${appDoc._id.toString()}/theme`)
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: { primary: 'red;}</style>' } })

      expect(res.status).toBe(422)
    })

    it('rejects non-http logo URLs', async () => {
      const user = await createUser({ email: 'o@test.com', username: 'o' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${appDoc._id.toString()}/theme`)
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: { logo: 'javascript:alert(1)' } })

      expect(res.status).toBe(422)
    })

    it('returns 404 when caller is not owner and not superadmin', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'o' })
      const other = await createUser({ email: 'x@test.com', username: 'x' })
      const token = generateAccessToken(other)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${appDoc._id.toString()}/theme`)
        .set('Authorization', `Bearer ${token}`)
        .send({ themeEnabled: true })

      expect(res.status).toBe(404)
    })

    it('superadmin can update any application theme', async () => {
      const owner = await createUser({ email: 'o@test.com', username: 'o' })
      const admin = await createAdminUser({ email: 'su@test.com', username: 'su' })
      const token = generateAccessToken(admin)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: owner._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${appDoc._id.toString()}/theme`)
        .set('Authorization', `Bearer ${token}`)
        .send({ themeEnabled: true })

      expect(res.status).toBe(200)
      expect(res.body.data.themeEnabled).toBe(true)
    })

    it('returns 422 when body has neither theme nor themeEnabled', async () => {
      const user = await createUser({ email: 'o@test.com', username: 'o' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
      })

      const res = await request(app)
        .patch(`/api/applications/${appDoc._id.toString()}/theme`)
        .set('Authorization', `Bearer ${token}`)
        .send({})

      expect(res.status).toBe(422)
    })

    it('passing theme=null clears saved tokens', async () => {
      const user = await createUser({ email: 'o@test.com', username: 'o' })
      const token = generateAccessToken(user)

      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
        theme: { primary: '#00D9F7' },
        themeEnabled: true,
      })

      const res = await request(app)
        .patch(`/api/applications/${appDoc._id.toString()}/theme`)
        .set('Authorization', `Bearer ${token}`)
        .send({ theme: null })

      expect(res.status).toBe(200)
      expect(res.body.data.theme).toBeNull()
    })
  })

  describe('GET /api/keys/config — theme exposure', () => {
    it('returns the theme only when themeEnabled=true AND tokens are set', async () => {
      const user = await createUser({ email: 'o@test.com', username: 'o' })
      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
        theme: { primary: '#00D9F7' },
        themeEnabled: true,
      })

      // Bind a key to the application
      const { rawKey } = await createApiKey(user._id!.toString(), {
        appName: 'acme',
        scope: 'user',
        applicationId: appDoc._id.toString(),
      })

      const res = await request(app).get(`/api/keys/config?key=${encodeURIComponent(rawKey)}`)

      expect(res.status).toBe(200)
      expect(res.body.data.appName).toBe('acme')
      expect(res.body.data.theme).toEqual({ primary: '#00D9F7' })
    })

    it('omits the theme when themeEnabled is false', async () => {
      const user = await createUser({ email: 'o@test.com', username: 'o' })
      const Application = await getApplicationModel()
      const appDoc = await Application.create({
        slug: 'acme',
        name: 'Acme',
        ownerId: user._id!.toString(),
        theme: { primary: '#00D9F7' },
        themeEnabled: false,
      })

      const { rawKey } = await createApiKey(user._id!.toString(), {
        appName: 'acme',
        scope: 'user',
        applicationId: appDoc._id.toString(),
      })

      const res = await request(app).get(`/api/keys/config?key=${encodeURIComponent(rawKey)}`)

      expect(res.status).toBe(200)
      expect(res.body.data.theme).toBeUndefined()
    })

    it('omits the theme when key has no applicationId', async () => {
      const user = await createUser({ email: 'o@test.com', username: 'o' })
      const { rawKey } = await createApiKey(user._id!.toString(), {
        appName: 'someapp',
        scope: 'user',
      })

      const res = await request(app).get(`/api/keys/config?key=${encodeURIComponent(rawKey)}`)

      expect(res.status).toBe(200)
      expect(res.body.data.theme).toBeUndefined()
    })
  })
})
