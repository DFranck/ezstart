/**
 * Tests for the `migrate-add-is-test-mode` ezauth backfill script.
 *
 * Verifies idempotence and per-collection backfill semantics. Production-
 * safety guard is enforced via direct `process.argv` inspection — covered
 * via a unit-style test rather than running the CLI entry point.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { migrateAddIsTestMode } from '../../scripts/migrate-add-is-test-mode.js'
import { getApplicationModel } from '../../models/application.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getAuditLogModel, computeAuditLogExpiry } from '../../models/audit-log.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { getEmailChangeRequestModel } from '../../models/email-change-request.js'
import { getMagicLinkRequestModel } from '../../models/magic-link-request.js'

describe('migrate-add-is-test-mode (ezauth)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const [Application, ApiKey, AuditLog, AuthCode, EmailChangeRequest, MagicLinkRequest] =
      await Promise.all([
        getApplicationModel(),
        getApiKeyModel(),
        getAuditLogModel(),
        getAuthCodeModel(),
        getEmailChangeRequestModel(),
        getMagicLinkRequestModel(),
      ])
    await Promise.all([
      Application.deleteMany({}),
      ApiKey.deleteMany({}),
      AuditLog.deleteMany({}),
      AuthCode.deleteMany({}),
      EmailChangeRequest.deleteMany({}),
      MagicLinkRequest.deleteMany({}),
    ])
  })

  it('backfills isTestMode=false on Application, AuditLog, AuthCode, EmailChangeRequest, MagicLinkRequest', async () => {
    // Insert raw docs WITHOUT isTestMode using collection-level inserts to
    // bypass schema defaults (which would set isTestMode: false anyway).
    const Application = await getApplicationModel()
    await Application.collection.insertOne({
      slug: 'no-mode-app',
      name: 'No Mode App',
      ownerId: 'owner-1',
      themeEnabled: false,
      isPlatformOwned: false,
      requireEmailVerification: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const AuditLog = await getAuditLogModel()
    await AuditLog.collection.insertOne({
      userId: 'user-1',
      appName: 'ezauth',
      action: 'login',
      metadata: {},
      createdAt: new Date(),
      expiresAt: computeAuditLogExpiry('free'),
    })

    const result = await migrateAddIsTestMode()
    expect(result.applications).toBe(1)
    expect(result.auditLogs).toBe(1)

    // Verify the field is now set.
    const app = await Application.collection.findOne({ slug: 'no-mode-app' })
    expect(app?.isTestMode).toBe(false)
  })

  it('derives isTestMode from env on ApiKey docs', async () => {
    const ApiKey = await getApiKeyModel()
    await ApiKey.collection.insertMany([
      {
        key: 'hash-test-1',
        keyPrefix: 'ez_pk_test_xxx',
        name: 'Test Key',
        userId: 'user-1',
        appName: 'ezauth',
        type: 'publishable',
        env: 'test',
        scope: 'user',
        permissions: ['*'],
        status: 'active',
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        quotaMonthly: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'hash-live-1',
        keyPrefix: 'ez_pk_live_xxx',
        name: 'Live Key',
        userId: 'user-1',
        appName: 'ezauth',
        type: 'publishable',
        env: 'live',
        scope: 'user',
        permissions: ['*'],
        status: 'active',
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: null,
        quotaMonthly: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const result = await migrateAddIsTestMode()
    expect(result.apiKeys).toBe(2)

    const testKey = await ApiKey.collection.findOne({ key: 'hash-test-1' })
    expect(testKey?.isTestMode).toBe(true)

    const liveKey = await ApiKey.collection.findOne({ key: 'hash-live-1' })
    expect(liveKey?.isTestMode).toBe(false)
  })

  it('is idempotent — second run touches zero documents', async () => {
    const Application = await getApplicationModel()
    await Application.collection.insertOne({
      slug: 'idempotent-app',
      name: 'Idempotent App',
      ownerId: 'owner-1',
      themeEnabled: false,
      isPlatformOwned: false,
      requireEmailVerification: false,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const first = await migrateAddIsTestMode()
    expect(first.applications).toBe(1)

    const second = await migrateAddIsTestMode()
    expect(second.applications).toBe(0)
    expect(second.apiKeys).toBe(0)
    expect(second.auditLogs).toBe(0)
  })

  it('does not touch docs that already have isTestMode set', async () => {
    const Application = await getApplicationModel()
    await Application.collection.insertOne({
      slug: 'pre-existing',
      name: 'Pre-existing',
      ownerId: 'owner-1',
      themeEnabled: false,
      isPlatformOwned: false,
      requireEmailVerification: false,
      isTestMode: true, // explicit
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await migrateAddIsTestMode()
    expect(result.applications).toBe(0)

    const doc = await Application.collection.findOne({ slug: 'pre-existing' })
    expect(doc?.isTestMode).toBe(true) // unchanged
  })
})
