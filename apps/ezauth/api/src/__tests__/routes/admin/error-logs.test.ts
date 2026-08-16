/**
 * Tests for `GET /admin/error-logs` + `GET /admin/error-logs/:id`.
 *
 * Covers auth gating (401 / 403), pagination, filters (level / statusCode
 * range / url substring / userId), and single-entry retrieval.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import {
  createUser,
  createAdminUser,
  generateAccessToken,
  cleanAllCollections,
} from '../../helpers/setup.js'
import errorLogsRouter from '../../../routes/admin/error-logs.js'
import { getErrorLogModel } from '../../../models/error-log.js'

function createErrorLogsApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/admin', errorLogsRouter)
  return app
}

async function seed(count: number, overrides: (i: number) => Record<string, unknown> = () => ({})) {
  const ErrorLog = await getErrorLogModel()
  const docs = Array.from({ length: count }).map((_, i) => ({
    timestamp: new Date(Date.now() - i * 1000),
    level: 'error',
    message: `seed message #${i}`,
    errorName: 'TypeError',
    url: `/api/widgets/${i}`,
    method: 'GET',
    statusCode: 500,
    ...overrides(i),
  }))
  await ErrorLog.insertMany(docs)
}

describe('GET /admin/error-logs', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createErrorLogsApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    const ErrorLog = await getErrorLogModel()
    await ErrorLog.deleteMany({})
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/admin/error-logs')
    expect(res.status).toBe(401)
  })

  it('rejects regular user with 403 (requireAdmin gate)', async () => {
    const user = await createUser({ email: 'reg@test.com', username: 'reg' })
    const token = generateAccessToken(user)

    const res = await request(app).get('/admin/error-logs').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('returns paginated list of error logs sorted by timestamp desc', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    await seed(60)

    const res = await request(app)
      .get('/admin/error-logs?limit=20&offset=0')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveLength(20)
    expect(res.body.meta).toMatchObject({ total: 60, limit: 20, offset: 0 })
    // Most recent first.
    expect(res.body.data[0].message).toBe('seed message #0')
    expect(res.body.data[19].message).toBe('seed message #19')
  })

  it('honors the offset for pagination page 2', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    await seed(60)

    const res = await request(app)
      .get('/admin/error-logs?limit=20&offset=20')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(20)
    expect(res.body.data[0].message).toBe('seed message #20')
  })

  it('filters by level', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    await seed(5, i => ({ level: i % 2 === 0 ? 'error' : 'warn' }))

    const res = await request(app)
      .get('/admin/error-logs?level=warn')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.every((d: { level: string }) => d.level === 'warn')).toBe(true)
    expect(res.body.meta.total).toBe(2) // i=1, i=3
  })

  it('filters by statusCodeRange=5xx', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    await seed(4, i => ({ statusCode: i < 2 ? 404 : 503 }))

    const res = await request(app)
      .get('/admin/error-logs?statusCodeRange=5xx')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(2)
    expect(res.body.data.every((d: { statusCode: number }) => d.statusCode === 503)).toBe(true)
  })

  it('filters by statusCodeRange=4xx', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    await seed(4, i => ({ statusCode: i < 2 ? 404 : 503 }))

    const res = await request(app)
      .get('/admin/error-logs?statusCodeRange=4xx')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(2)
    expect(res.body.data.every((d: { statusCode: number }) => d.statusCode === 404)).toBe(true)
  })

  it('filters by url substring (case-insensitive)', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    await seed(3, i => ({
      url: i === 0 ? '/api/donations/123' : i === 1 ? '/api/users/me' : '/api/donations/abc',
    }))

    const res = await request(app)
      .get('/admin/error-logs?url=DONATIONS')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(2)
  })

  it('filters by userId', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    await seed(3, i => ({ userId: i === 1 ? 'user-target' : 'user-other' }))

    const res = await request(app)
      .get('/admin/error-logs?userId=user-target')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(1)
    expect(res.body.data[0].userId).toBe('user-target')
  })

  it('rejects invalid limit (>200)', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)

    const res = await request(app)
      .get('/admin/error-logs?limit=999')
      .set('Authorization', `Bearer ${token}`)

    // sendValidationError → 422 (canonical Express helper response)
    expect(res.status).toBe(422)
  })

  it('omits sensitive fields (stack/userAgent/context) from the list response', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    const ErrorLog = await getErrorLogModel()
    await ErrorLog.create({
      timestamp: new Date(),
      level: 'error',
      message: 'has stack',
      stack: 'TRACE_LINE\n  at boom',
      userAgent: 'AcmeAgent/1.0',
      context: { secretKey: 'should-not-leak' },
    })

    const res = await request(app).get('/admin/error-logs').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const entry = res.body.data[0]
    expect(entry.message).toBe('has stack')
    // Stack/userAgent/context not in list view — only available via detail GET.
    expect(entry.stack).toBeUndefined()
    expect(entry.userAgent).toBeUndefined()
    expect(entry.context).toBeUndefined()
  })
})

describe('GET /admin/error-logs/:id', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createErrorLogsApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    const ErrorLog = await getErrorLogModel()
    await ErrorLog.deleteMany({})
  })

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/admin/error-logs/507f1f77bcf86cd799439011')
    expect(res.status).toBe(401)
  })

  it('rejects regular user with 403', async () => {
    const user = await createUser({ email: 'reg2@test.com', username: 'reg2' })
    const token = generateAccessToken(user)
    const res = await request(app)
      .get('/admin/error-logs/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('returns 422 for invalid ObjectId format', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    const res = await request(app)
      .get('/admin/error-logs/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(422)
  })

  it('returns 404 when the entry does not exist', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    const res = await request(app)
      .get('/admin/error-logs/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns the full detail (stack + userAgent + context) for an existing entry', async () => {
    const admin = await createAdminUser()
    const token = generateAccessToken(admin)
    const ErrorLog = await getErrorLogModel()
    const doc = await ErrorLog.create({
      timestamp: new Date(),
      level: 'error',
      message: 'detailed boom',
      errorName: 'TypeError',
      stack: 'TypeError: detailed boom\n    at boom (file.js:42:1)',
      url: '/api/widgets/1',
      method: 'POST',
      statusCode: 500,
      userId: 'user-detail',
      ip: '203.0.113.99',
      userAgent: 'AcmeAgent/2.0',
      env: 'staging',
      releaseSha: 'deadbeef',
      context: { applicationId: 'app-99' },
    })

    const res = await request(app)
      .get(`/admin/error-logs/${String(doc._id)}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const data = res.body.data
    expect(data.message).toBe('detailed boom')
    expect(data.stack).toContain('TypeError')
    expect(data.userAgent).toBe('AcmeAgent/2.0')
    expect(data.context).toEqual({ applicationId: 'app-99' })
    expect(data.releaseSha).toBe('deadbeef')
    expect(data.env).toBe('staging')
  })
})
