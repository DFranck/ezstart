import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import type { Request } from 'express'
import { AuditLogService } from '../../services/audit-log.service.js'
import {
  AUDIT_LOG_RETENTION_DAYS,
  computeAuditLogExpiry,
  getAuditLogModel,
} from '../../models/audit-log.js'

function fakeRequest(overrides: Partial<Request> = {}): Request {
  const headers: Record<string, string> = {
    'user-agent': 'AcmeAgent/1.0 (Test)',
    'x-forwarded-for': '203.0.113.42, 10.0.0.1',
  }
  return {
    headers,
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request
}

describe('AuditLogService', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const AuditLog = await getAuditLogModel()
    await AuditLog.deleteMany({})
  })

  describe('computeAuditLogExpiry', () => {
    it('computes free-tier deadline 30 days in the future', () => {
      const now = new Date('2026-01-01T00:00:00Z')
      const expiry = computeAuditLogExpiry('free', now)
      expect(expiry.getTime() - now.getTime()).toBe(
        AUDIT_LOG_RETENTION_DAYS.free * 24 * 60 * 60 * 1000
      )
    })

    it('computes pro-tier deadline 365 days in the future', () => {
      const now = new Date('2026-01-01T00:00:00Z')
      const expiry = computeAuditLogExpiry('pro', now)
      expect(expiry.getTime() - now.getTime()).toBe(
        AUDIT_LOG_RETENTION_DAYS.pro * 24 * 60 * 60 * 1000
      )
    })

    it('defaults to free-tier retention when plan is omitted', () => {
      const now = new Date('2026-01-01T00:00:00Z')
      const expiry = computeAuditLogExpiry(undefined, now)
      expect(expiry.getTime() - now.getTime()).toBe(
        AUDIT_LOG_RETENTION_DAYS.free * 24 * 60 * 60 * 1000
      )
    })
  })

  describe('create()', () => {
    it('persists an entry with default appName=ezauth and free retention', async () => {
      await AuditLogService.create({
        userId: 'user-1',
        action: 'login',
        metadata: { custom: 'value' },
      })

      const AuditLog = await getAuditLogModel()
      const docs = await AuditLog.find({ userId: 'user-1' })
      expect(docs).toHaveLength(1)
      const doc = docs[0]!
      expect(doc.appName).toBe('ezauth')
      expect(doc.action).toBe('login')
      expect(doc.metadata).toMatchObject({ custom: 'value' })
      expect(doc.createdAt).toBeInstanceOf(Date)
      expect(doc.expiresAt).toBeInstanceOf(Date)
      // Expiry must be in the future (30-day window)
      expect(doc.expiresAt.getTime()).toBeGreaterThan(doc.createdAt.getTime())
    })

    it('honours pro-tier retention when explicitly requested', async () => {
      await AuditLogService.create({
        userId: 'user-pro',
        action: 'api_key_created',
        plan: 'pro',
      })

      const AuditLog = await getAuditLogModel()
      const doc = await AuditLog.findOne({ userId: 'user-pro' }).lean()
      expect(doc).toBeTruthy()
      const span = doc!.expiresAt.getTime() - doc!.createdAt.getTime()
      // Expect ~365 days, allow a tiny clock-skew window
      const oneDay = 24 * 60 * 60 * 1000
      expect(span).toBeGreaterThan(364 * oneDay)
      expect(span).toBeLessThan(366 * oneDay)
    })

    it('persists a custom appName when provided', async () => {
      await AuditLogService.create({
        userId: 'user-2',
        action: 'api_key_revoked',
        appName: 'green-pulse',
      })

      const AuditLog = await getAuditLogModel()
      const doc = await AuditLog.findOne({ userId: 'user-2' }).lean()
      expect(doc?.appName).toBe('green-pulse')
    })

    it('never throws even if the metadata payload is empty', async () => {
      await expect(
        AuditLogService.create({
          userId: 'user-3',
          action: '2fa_enabled',
        })
      ).resolves.toBeUndefined()

      const AuditLog = await getAuditLogModel()
      const doc = await AuditLog.findOne({ userId: 'user-3' }).lean()
      expect(doc).toBeTruthy()
      // Mongoose `Schema.Types.Mixed` with `default: {}` may store
      // `undefined` when nothing is written into the path (lean mode
      // strips it). The important guarantee is that the document
      // persists without error.
      expect(doc?.metadata ?? {}).toEqual({})
    })
  })

  describe('createFromRequest()', () => {
    /**
     * M2 (2026-05-15): extractIp uses Express's proxy-aware `req.ip` instead
     * of raw `X-Forwarded-For` parsing. With trust proxy configured, `req.ip`
     * is the canonical resolved client IP — the raw XFF leftmost value is
     * forgeable by clients and was a forensics-poisoning vector.
     *
     * In tests, the fakeRequest sets req.ip='127.0.0.1' (the proxy-resolved
     * value Express would expose). XFF is left in the headers to confirm the
     * raw spoofable value is NOT picked up.
     */
    it('uses req.ip (proxy-aware) instead of raw X-Forwarded-For', async () => {
      const req = fakeRequest()
      await AuditLogService.createFromRequest(req, {
        userId: 'user-4',
        action: 'login',
      })

      const AuditLog = await getAuditLogModel()
      const doc = await AuditLog.findOne({ userId: 'user-4' }).lean()
      expect(doc?.metadata).toMatchObject({
        ip: '127.0.0.1',
        userAgent: 'AcmeAgent/1.0 (Test)',
      })
      // Critical: the spoofable leftmost XFF value MUST NOT be persisted.
      expect(doc?.metadata?.ip).not.toBe('203.0.113.42')
    })

    it('uses req.ip when no proxy header is present', async () => {
      const req = fakeRequest({
        headers: { 'user-agent': 'Mozilla/5.0' },
      })
      await AuditLogService.createFromRequest(req, {
        userId: 'user-5',
        action: 'logout',
      })

      const AuditLog = await getAuditLogModel()
      const doc = await AuditLog.findOne({ userId: 'user-5' }).lean()
      expect(doc?.metadata).toMatchObject({
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      })
    })

    it('lets caller-supplied metadata override the auto-extracted IP', async () => {
      const req = fakeRequest()
      await AuditLogService.createFromRequest(req, {
        userId: 'user-6',
        action: 'session_revoked',
        metadata: { sessionId: 'sess-xyz', ip: 'override' },
      })

      const AuditLog = await getAuditLogModel()
      const doc = await AuditLog.findOne({ userId: 'user-6' }).lean()
      expect(doc?.metadata).toMatchObject({
        sessionId: 'sess-xyz',
        ip: 'override',
        userAgent: 'AcmeAgent/1.0 (Test)',
      })
    })
  })
})
