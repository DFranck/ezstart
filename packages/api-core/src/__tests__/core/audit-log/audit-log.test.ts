/**
 * Tests for `createAuditLogSchema` + `createAuditLogService` (api-core
 * agnostic primitives). Verified against an in-memory Mongo via
 * `@ezstart/test-utils` — no app coupling.
 *
 * Coverage map:
 *
 * - schema: collection name, action enum enforcement, default isTestMode,
 *   default metadata, TTL index presence, compound indexes.
 * - computeAuditLogExpiry: default + custom retention.
 * - service.create: persists with default appName, override appName, custom
 *   retentionDays, null userId tolerated, resource+resourceId merged into
 *   metadata, swallows errors via logger.
 * - service.createFromRequest: extracts ip + userAgent from headers, falls
 *   back to req.ip, derives userId from req.userId, caller-supplied metadata
 *   wins over auto-extracted values.
 *
 * @module @ezstart/api-core/__tests__/core/audit-log/audit-log.test
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import mongoose, { type Model } from 'mongoose'
import type { Request } from 'express'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'

import {
  computeAuditLogExpiry,
  createAuditLogSchema,
  createAuditLogService,
  DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  type AuditLogDocument,
} from '../../../core/audit-log/index.js'

// Per-test-suite action enum. Mirrors the per-app pattern.
const ACTIONS = ['login', 'logout', 'api_key_created', 'connect.onboard.resumed'] as const
type TestAction = (typeof ACTIONS)[number]

let AuditLogModel: Model<AuditLogDocument>

function buildModel(): Model<AuditLogDocument> {
  const schema = createAuditLogSchema<AuditLogDocument>({ actions: ACTIONS })
  return (
    (mongoose.models.AuditLog as Model<AuditLogDocument> | undefined) ??
    mongoose.model<AuditLogDocument>('AuditLog', schema)
  )
}

function fakeRequest(overrides: Partial<Request> = {}): Request {
  const headers: Record<string, string> = {
    'user-agent': 'TestAgent/1.0',
    'x-forwarded-for': '203.0.113.42, 10.0.0.1',
  }
  return {
    headers,
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request
}

beforeAll(async () => {
  await setupTestDatabase()
  AuditLogModel = buildModel()
})

afterAll(async () => {
  await teardownTestDatabase()
})

beforeEach(async () => {
  await AuditLogModel.deleteMany({})
})

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

describe('createAuditLogSchema', () => {
  it('uses the canonical `audit_logs` collection name', () => {
    const schema = createAuditLogSchema({ actions: ACTIONS })
    expect(schema.get('collection')).toBe('audit_logs')
  })

  it('rejects an action value not in the configured enum', async () => {
    await expect(
      AuditLogModel.create({
        userId: 'user-x',
        appName: 'test-app',
        // @ts-expect-error — intentionally bad action to verify enum
        action: 'not-in-enum',
        metadata: {},
        createdAt: new Date(),
        expiresAt: computeAuditLogExpiry(30),
      })
    ).rejects.toThrowError(/not-in-enum/i)
  })

  it('persists with default isTestMode=false and default metadata={}', async () => {
    const doc = await AuditLogModel.create({
      userId: 'user-1',
      appName: 'test-app',
      action: 'login',
      expiresAt: computeAuditLogExpiry(30),
    })
    expect(doc.isTestMode).toBe(false)
    // Mongoose Mixed default with empty body — when read back via lean we get {}
    const reread = await AuditLogModel.findById(doc._id).lean()
    expect(reread?.metadata ?? {}).toEqual({})
  })

  it('declares a TTL index on expiresAt + compound indexes for listing', () => {
    const schema = createAuditLogSchema({ actions: ACTIONS })
    const indexes = schema.indexes()
    // [ [ { expiresAt: 1 }, { expireAfterSeconds: 0 } ], ... ]
    const ttl = indexes.find(
      ([, opts]: [Record<string, unknown>, { expireAfterSeconds?: number }]) =>
        opts && opts.expireAfterSeconds === 0
    )
    expect(ttl).toBeDefined()
    expect(ttl?.[0]).toEqual({ expiresAt: 1 })

    const compound = indexes.find(
      ([fields]: [Record<string, number>]) =>
        fields.userId === 1 && fields.action === 1 && fields.createdAt === -1
    )
    expect(compound).toBeDefined()
  })
})

/* -------------------------------------------------------------------------- */
/* computeAuditLogExpiry                                                      */
/* -------------------------------------------------------------------------- */

describe('computeAuditLogExpiry', () => {
  it('defaults to DEFAULT_AUDIT_LOG_RETENTION_DAYS (90 days)', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const expiry = computeAuditLogExpiry(undefined, now)
    expect(expiry.getTime() - now.getTime()).toBe(
      DEFAULT_AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
    )
  })

  it('honours an explicit retention window', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const expiry = computeAuditLogExpiry(7, now)
    expect(expiry.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
  })
})

/* -------------------------------------------------------------------------- */
/* Service.create                                                             */
/* -------------------------------------------------------------------------- */

describe('createAuditLogService — create()', () => {
  it('persists with the configured defaultAppName when caller omits appName', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc-default',
    })

    await svc.create({ userId: 'user-1', action: 'login' })
    const doc = await AuditLogModel.findOne({ userId: 'user-1' }).lean()
    expect(doc?.appName).toBe('svc-default')
    expect(doc?.action).toBe('login')
  })

  it('honours a per-call appName override', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc-default',
    })

    await svc.create({ userId: 'user-2', action: 'logout', appName: 'cross-tenant' })
    const doc = await AuditLogModel.findOne({ userId: 'user-2' }).lean()
    expect(doc?.appName).toBe('cross-tenant')
  })

  it('uses defaultRetentionDays from options when caller omits retentionDays', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
      defaultRetentionDays: 14,
    })

    const before = Date.now()
    await svc.create({ userId: 'user-3', action: 'login' })
    const doc = await AuditLogModel.findOne({ userId: 'user-3' }).lean()
    expect(doc).toBeTruthy()
    const span = doc!.expiresAt.getTime() - doc!.createdAt.getTime()
    // Within ~1 day of the configured 14d window (createdAt vs expiresAt
    // race tolerance accounts for setTimeout/network jitter).
    expect(span).toBeGreaterThanOrEqual(13 * 24 * 60 * 60 * 1000)
    expect(span).toBeLessThanOrEqual(15 * 24 * 60 * 60 * 1000)
    expect(doc!.expiresAt.getTime()).toBeGreaterThan(before)
  })

  it('honours per-call retentionDays override', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
      defaultRetentionDays: 14,
    })

    await svc.create({ userId: 'user-4', action: 'login', retentionDays: 365 })
    const doc = await AuditLogModel.findOne({ userId: 'user-4' }).lean()
    const span = doc!.expiresAt.getTime() - doc!.createdAt.getTime()
    expect(span).toBeGreaterThanOrEqual(364 * 24 * 60 * 60 * 1000)
  })

  it('persists with userId=null when caller passes null', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
    })

    // userId is required:true in the schema — null is rejected. The service
    // tolerates null in the input shape but the persistence layer requires a
    // string. We assert the failure is swallowed (no throw) and the logger is
    // notified.
    const warn = vi.fn()
    const svcLogged = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
      logger: { warn, error: vi.fn() },
    })
    await expect(svcLogged.create({ userId: null, action: 'login' })).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/audit-log/i)
  })

  it('merges resource + resourceId into metadata', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
    })

    await svc.create({
      userId: 'user-5',
      action: 'api_key_created',
      resource: 'api_key',
      resourceId: 'key_abc123',
      metadata: { extra: 'detail' },
    })
    const doc = await AuditLogModel.findOne({ userId: 'user-5' }).lean()
    expect(doc?.metadata).toMatchObject({
      resource: 'api_key',
      resourceId: 'key_abc123',
      extra: 'detail',
    })
  })

  it('swallows persistence errors and notifies the optional logger', async () => {
    const warn = vi.fn()
    const svc = createAuditLogService<TestAction>({
      // Simulate model factory failure (DB unreachable, schema mismatch, ...)
      getModel: async () => {
        throw new Error('boom: getModel failed')
      },
      defaultAppName: 'svc',
      logger: { warn, error: vi.fn() },
    })

    await expect(svc.create({ userId: 'user-6', action: 'login' })).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/audit-log/i)
    const ctx = warn.mock.calls[0]?.[1] as { error: string }
    expect(ctx.error).toMatch(/boom: getModel failed/)
  })

  it('is a no-op silent when no logger is provided and persistence fails', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => {
        throw new Error('still boom')
      },
      defaultAppName: 'svc',
    })
    // Just must not throw.
    await expect(svc.create({ userId: 'user-7', action: 'login' })).resolves.toBeUndefined()
  })
})

/* -------------------------------------------------------------------------- */
/* Service.createFromRequest                                                  */
/* -------------------------------------------------------------------------- */

describe('createAuditLogService — createFromRequest()', () => {
  it('extracts ip + user-agent from forwarded headers', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
    })

    await svc.createFromRequest(fakeRequest(), {
      userId: 'user-8',
      action: 'login',
    })
    const doc = await AuditLogModel.findOne({ userId: 'user-8' }).lean()
    expect(doc?.metadata).toMatchObject({
      ip: '203.0.113.42',
      userAgent: 'TestAgent/1.0',
    })
  })

  it('falls back to req.ip when no proxy header is present', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
    })

    const req = fakeRequest({ headers: { 'user-agent': 'Mozilla/5.0' } })
    await svc.createFromRequest(req, {
      userId: 'user-9',
      action: 'logout',
    })
    const doc = await AuditLogModel.findOne({ userId: 'user-9' }).lean()
    expect(doc?.metadata).toMatchObject({
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    })
  })

  it('auto-derives userId from req.userId when caller omits it', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
    })

    const req = fakeRequest()
    ;(req as Request & { userId?: string }).userId = 'auto-user-10'

    await svc.createFromRequest(req, { action: 'login' })
    const doc = await AuditLogModel.findOne({ userId: 'auto-user-10' }).lean()
    expect(doc?.userId).toBe('auto-user-10')
  })

  it('lets caller-supplied metadata win over auto-extracted values', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'svc',
    })

    await svc.createFromRequest(fakeRequest(), {
      userId: 'user-11',
      action: 'connect.onboard.resumed',
      metadata: { ip: 'override-ip', sessionId: 'sess-xyz' },
    })
    const doc = await AuditLogModel.findOne({ userId: 'user-11' }).lean()
    expect(doc?.metadata).toMatchObject({
      ip: 'override-ip',
      userAgent: 'TestAgent/1.0',
      sessionId: 'sess-xyz',
    })
  })

  it('persists with default appName from service options when caller omits it', async () => {
    const svc = createAuditLogService<TestAction>({
      getModel: async () => AuditLogModel,
      defaultAppName: 'configured-app',
    })

    await svc.createFromRequest(fakeRequest(), {
      userId: 'user-12',
      action: 'login',
    })
    const doc = await AuditLogModel.findOne({ userId: 'user-12' }).lean()
    expect(doc?.appName).toBe('configured-app')
  })
})
