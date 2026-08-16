import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { sendError, sendSuccess, sendValidationError } from '@ezstart/api-core'
import { z } from 'zod'
import { verifyTokenMiddleware } from '../../../middleware/auth.js'
import { AuditLogService } from '../../../services/audit-log.service.js'
import {
  AUDIT_LOG_ACTIONS,
  computeAuditLogExpiry,
  getAuditLogModel,
} from '../../../models/audit-log.js'
import { cleanAllCollections, createUser, generateAccessToken } from '../../helpers/setup.js'

/**
 * Bridge userId from req.user into req.userId so the handler can pick
 * it up the same way it does behind the real api-core middleware.
 */
function bridgeUserId(req: express.Request, _res: express.Response, next: express.NextFunction) {
  if (req.user?._id && !req.userId) {
    req.userId = req.user._id
  }
  next()
}

const querySchema = z.object({
  limit: z
    .preprocess(v => (typeof v === 'string' ? Number(v) : v), z.number().int().min(1).max(100))
    .optional()
    .default(20),
  offset: z
    .preprocess(v => (typeof v === 'string' ? Number(v) : v), z.number().int().min(0))
    .optional()
    .default(0),
  action: z.enum(AUDIT_LOG_ACTIONS).optional(),
})

function createAuditLogTestApp() {
  const app = express()
  app.use(express.json())
  app.get('/me/audit-log', verifyTokenMiddleware, bridgeUserId, async (req, res) => {
    const userId = req.userId
    if (!userId) return sendError(res, 'Authentication required', 401)
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      return sendValidationError(res, 'Invalid audit log query', parsed.error.issues)
    }
    const { limit, offset, action } = parsed.data
    const filter: Record<string, unknown> = { userId }
    if (action) filter.action = action

    const AuditLog = await getAuditLogModel()
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ])

    sendSuccess(res, {
      items: items.map(item => ({
        id: item._id.toString(),
        userId: item.userId,
        appName: item.appName,
        action: item.action,
        metadata: item.metadata ?? {},
        createdAt: item.createdAt.toISOString(),
        expiresAt: item.expiresAt.toISOString(),
      })),
      total,
      limit,
      offset,
    })
  })
  return app
}

describe('GET /me/audit-log', () => {
  let app: express.Express

  beforeAll(async () => {
    await setupTestDatabase()
    app = createAuditLogTestApp()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await cleanAllCollections()
    const AuditLog = await getAuditLogModel()
    await AuditLog.deleteMany({})
  })

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/me/audit-log')
    expect(res.status).toBe(401)
  })

  it('returns an empty list when the user has no entries', async () => {
    const user = await createUser({ email: 'audit-empty@test.com', username: 'auditempty' })
    const token = generateAccessToken(user)

    const res = await request(app).get('/me/audit-log').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.items).toEqual([])
    expect(res.body.data.total).toBe(0)
    expect(res.body.data.limit).toBe(20)
    expect(res.body.data.offset).toBe(0)
  })

  it('returns the user own entries scoped by userId', async () => {
    const me = await createUser({ email: 'audit-me@test.com', username: 'auditme' })
    const other = await createUser({ email: 'audit-other@test.com', username: 'auditother' })

    await AuditLogService.create({ userId: me._id!.toString(), action: 'login' })
    await AuditLogService.create({ userId: me._id!.toString(), action: 'password_change' })
    await AuditLogService.create({ userId: other._id!.toString(), action: 'login' })

    const token = generateAccessToken(me)
    const res = await request(app).get('/me/audit-log').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.items).toHaveLength(2)
    expect(res.body.data.total).toBe(2)
    const actions = res.body.data.items.map((i: { action: string }) => i.action).sort()
    expect(actions).toEqual(['login', 'password_change'])
  })

  it('paginates with limit + offset', async () => {
    const user = await createUser({ email: 'audit-paginate@test.com', username: 'auditpag' })
    for (let i = 0; i < 5; i += 1) {
      await AuditLogService.create({ userId: user._id!.toString(), action: 'login' })
    }
    const token = generateAccessToken(user)

    const first = await request(app)
      .get('/me/audit-log?limit=2&offset=0')
      .set('Authorization', `Bearer ${token}`)
    expect(first.status).toBe(200)
    expect(first.body.data.items).toHaveLength(2)
    expect(first.body.data.total).toBe(5)

    const next = await request(app)
      .get('/me/audit-log?limit=2&offset=2')
      .set('Authorization', `Bearer ${token}`)
    expect(next.status).toBe(200)
    expect(next.body.data.items).toHaveLength(2)
    expect(next.body.data.offset).toBe(2)
  })

  it('filters by action type', async () => {
    const user = await createUser({ email: 'audit-filter@test.com', username: 'auditfil' })
    const userId = user._id!.toString()
    await AuditLogService.create({ userId, action: 'login' })
    await AuditLogService.create({ userId, action: 'password_change' })
    await AuditLogService.create({ userId, action: 'api_key_created' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .get('/me/audit-log?action=password_change')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.items).toHaveLength(1)
    expect(res.body.data.items[0].action).toBe('password_change')
  })

  it('rejects invalid action filter values', async () => {
    const user = await createUser({ email: 'audit-bad@test.com', username: 'auditbad' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .get('/me/audit-log?action=not_a_real_action')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(422)
  })

  it('rejects out-of-range limit values', async () => {
    const user = await createUser({ email: 'audit-limit@test.com', username: 'auditlimit' })
    const token = generateAccessToken(user)

    const res = await request(app)
      .get('/me/audit-log?limit=9999')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(422)
  })

  it('returns entries sorted newest first', async () => {
    const user = await createUser({ email: 'audit-sort@test.com', username: 'auditsort' })
    const userId = user._id!.toString()
    const AuditLog = await getAuditLogModel()
    const oldDate = new Date('2026-01-01T00:00:00Z')
    const newDate = new Date('2026-04-01T00:00:00Z')
    await AuditLog.create({
      userId,
      appName: 'ezauth',
      action: 'login',
      metadata: {},
      createdAt: oldDate,
      expiresAt: computeAuditLogExpiry('free', oldDate),
    })
    await AuditLog.create({
      userId,
      appName: 'ezauth',
      action: 'logout',
      metadata: {},
      createdAt: newDate,
      expiresAt: computeAuditLogExpiry('free', newDate),
    })
    const token = generateAccessToken(user)

    const res = await request(app).get('/me/audit-log').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.items[0].action).toBe('logout')
    expect(res.body.data.items[1].action).toBe('login')
  })
})
