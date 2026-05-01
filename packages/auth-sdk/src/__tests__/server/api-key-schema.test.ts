/**
 * Tests for the `createApiKeySchema` and `createApiKeyUsageSchema` factories
 * shipped from `@ezstart/auth-sdk/server`.
 *
 * These tests instantiate the schemas in isolation (no MongoDB connection
 * required) and inspect their `paths`, `indexes()`, options, and validation
 * behaviour via `Document#validate()`. This keeps the test layer fast and
 * independent of `mongodb-memory-server`, while still exercising the real
 * Mongoose schema lifecycle.
 */

import { describe, expect, it } from 'vitest'
import mongoose, { Schema } from 'mongoose'

import { createApiKeySchema, type CreateApiKeySchemaOptions } from '../../server/api-key-schema.js'
import { createApiKeyUsageSchema } from '../../server/api-key-usage-schema.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let modelCounter = 0

/** Builds a unique-named model around a schema so each test gets a fresh slate. */
function makeApiKeyModel(opts?: CreateApiKeySchemaOptions) {
  const schema = createApiKeySchema(opts)
  const name = `ApiKey_${++modelCounter}`
  return mongoose.model(name, schema)
}

function makeUsageModel() {
  const schema = createApiKeyUsageSchema()
  const name = `ApiKeyUsage_${++modelCounter}`
  return mongoose.model(name, schema)
}

// ---------------------------------------------------------------------------
// createApiKeySchema — fields & defaults
// ---------------------------------------------------------------------------

describe('createApiKeySchema — fields & defaults', () => {
  it('exposes all canonical fields', () => {
    const schema = createApiKeySchema()
    const paths = Object.keys(schema.paths).sort()
    // Spot-check the canonical fields (timestamps add createdAt/updatedAt).
    expect(paths).toEqual(
      expect.arrayContaining([
        'key',
        'keyPrefix',
        'name',
        'userId',
        'applicationId',
        'type',
        'env',
        'scope',
        'permissions',
        'status',
        'lastUsedAt',
        'expiresAt',
        'revokedAt',
        'quotaMonthly',
        'createdBy',
        'isTestMode',
        'appName',
        'createdAt',
        'updatedAt',
      ])
    )
  })

  it('uses the api_keys collection and disables bufferCommands', () => {
    const schema = createApiKeySchema()
    const opts = schema.options as { collection?: string; bufferCommands?: boolean }
    expect(opts.collection).toBe('api_keys')
    expect(opts.bufferCommands).toBe(false)
  })

  it('omits appName when includeAppName is false', () => {
    const schema = createApiKeySchema({ includeAppName: false })
    expect(schema.paths).not.toHaveProperty('appName')
  })

  it('honours appNameDefault override', () => {
    const schema = createApiKeySchema({ appNameDefault: 'ezauth' })
    const path = schema.paths.appName as unknown as { defaultValue: string }
    expect(path.defaultValue).toBe('ezauth')
  })

  it('merges extraFields into the schema definition', () => {
    const schema = createApiKeySchema({
      extraFields: {
        appSlug: { type: String, required: true, lowercase: true },
      },
    })
    expect(schema.paths).toHaveProperty('appSlug')
  })
})

// ---------------------------------------------------------------------------
// createApiKeySchema — applicationId variants
// ---------------------------------------------------------------------------

describe('createApiKeySchema — applicationId variants', () => {
  it('defaults applicationId to ObjectId with ref Application', () => {
    const schema = createApiKeySchema()
    const path = schema.paths.applicationId as unknown as {
      instance: string
      options: { ref?: string; required?: boolean }
    }
    expect(path.instance).toBe('ObjectId')
    expect(path.options.ref).toBe('Application')
    expect(path.options.required).toBe(false)
  })

  it('uses string type when applicationIdType is "string"', () => {
    const schema = createApiKeySchema({ applicationIdType: 'string' })
    const path = schema.paths.applicationId as unknown as { instance: string }
    expect(path.instance).toBe('String')
  })

  it('marks applicationId required when requireApplicationId is true', () => {
    const schema = createApiKeySchema({ requireApplicationId: true })
    const path = schema.paths.applicationId as unknown as { isRequired: boolean }
    expect(path.isRequired).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// createApiKeySchema — scope enum
// ---------------------------------------------------------------------------

describe('createApiKeySchema — scope enum', () => {
  it('defaults to the strict modern enum', () => {
    const schema = createApiKeySchema()
    const path = schema.paths.scope as unknown as { enumValues: string[] }
    expect(path.enumValues).toEqual(['admin', 'user', 'readonly'])
  })

  it('accepts a wider legacy enum (ezauth pattern)', () => {
    const schema = createApiKeySchema({
      scopeEnum: ['admin', 'user', 'readonly', 'test', 'live'],
    })
    const path = schema.paths.scope as unknown as { enumValues: string[] }
    expect(path.enumValues).toEqual(['admin', 'user', 'readonly', 'test', 'live'])
  })
})

// ---------------------------------------------------------------------------
// createApiKeySchema — type / env required toggles
// ---------------------------------------------------------------------------

describe('createApiKeySchema — type/env required toggles', () => {
  it('makes type and env optional by default (ezauth pattern)', () => {
    const schema = createApiKeySchema()
    const typePath = schema.paths.type as unknown as { isRequired: boolean }
    const envPath = schema.paths.env as unknown as { isRequired: boolean }
    expect(typePath.isRequired).toBeFalsy()
    expect(envPath.isRequired).toBeFalsy()
  })

  it('makes type and env required when requested (ezpay pattern)', () => {
    const schema = createApiKeySchema({ requireType: true, requireEnv: true })
    const typePath = schema.paths.type as unknown as { isRequired: boolean }
    const envPath = schema.paths.env as unknown as { isRequired: boolean }
    expect(typePath.isRequired).toBe(true)
    expect(envPath.isRequired).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// createApiKeySchema — indexes
// ---------------------------------------------------------------------------

describe('createApiKeySchema — indexes', () => {
  it('declares the canonical compound indexes', () => {
    const schema = createApiKeySchema()
    const indexes = schema.indexes() as Array<[Record<string, number>, Record<string, unknown>?]>
    const keys = indexes.map(([k]) => k)
    expect(keys).toEqual(
      expect.arrayContaining([
        { userId: 1, status: 1 },
        { applicationId: 1, status: 1 },
      ])
    )
  })
})

// ---------------------------------------------------------------------------
// createApiKeySchema — validation behaviour (no DB needed)
// ---------------------------------------------------------------------------

describe('createApiKeySchema — validation', () => {
  it('rejects a doc missing required fields', async () => {
    const Model = makeApiKeyModel({ requireType: true, requireEnv: true })
    const doc = new Model({})
    await expect(doc.validate()).rejects.toThrow()
  })

  it('accepts a valid doc with defaults applied', async () => {
    const Model = makeApiKeyModel({
      scopeEnum: ['admin', 'user', 'readonly'],
      requireType: true,
      requireEnv: true,
    })
    const doc = new Model({
      key: 'hash-1',
      keyPrefix: 'ez_pk_live_abc',
      name: 'Test',
      userId: 'user-1',
      type: 'publishable',
      env: 'live',
    })
    await expect(doc.validate()).resolves.toBeUndefined()
    expect(doc.get('quotaMonthly')).toBe(1000)
    expect(doc.get('status')).toBe('active')
    expect(doc.get('scope')).toBe('user')
    expect(doc.get('permissions')).toEqual(['*'])
    expect(doc.get('isTestMode')).toBe(false)
  })

  it('rejects an invalid scope value', async () => {
    const Model = makeApiKeyModel()
    const doc = new Model({
      key: 'hash-1',
      keyPrefix: 'ez_pk_live_abc',
      name: 'Test',
      userId: 'user-1',
      scope: 'root',
    })
    await expect(doc.validate()).rejects.toThrow()
  })

  it('accepts legacy "test" scope when wider enum provided', async () => {
    const Model = makeApiKeyModel({
      scopeEnum: ['admin', 'user', 'readonly', 'test', 'live'],
    })
    const doc = new Model({
      key: 'hash-1',
      keyPrefix: 'ezk_test_abc',
      name: 'Legacy',
      userId: 'user-1',
      scope: 'test',
    })
    await expect(doc.validate()).resolves.toBeUndefined()
  })

  it('rejects name longer than 100 chars', async () => {
    const Model = makeApiKeyModel()
    const doc = new Model({
      key: 'hash-1',
      keyPrefix: 'ez_pk_live_abc',
      name: 'a'.repeat(101),
      userId: 'user-1',
    })
    await expect(doc.validate()).rejects.toThrow()
  })

  it('rejects invalid type / env enum values', async () => {
    const Model = makeApiKeyModel({ requireType: true, requireEnv: true })
    const docBadType = new Model({
      key: 'hash-1',
      keyPrefix: 'ez_pk_live_abc',
      name: 'Test',
      userId: 'user-1',
      type: 'invalid',
      env: 'live',
    })
    await expect(docBadType.validate()).rejects.toThrow()

    const docBadEnv = new Model({
      key: 'hash-2',
      keyPrefix: 'ez_pk_live_abc',
      name: 'Test',
      userId: 'user-1',
      type: 'publishable',
      env: 'staging',
    })
    await expect(docBadEnv.validate()).rejects.toThrow()
  })

  it('lowercases extraFields with lowercase: true', async () => {
    const Model = makeApiKeyModel({
      requireApplicationId: true,
      requireType: true,
      requireEnv: true,
      includeAppName: false,
      applicationIdType: 'string',
      extraFields: {
        appSlug: { type: String, required: true, lowercase: true, trim: true },
      },
    })
    const doc = new Model({
      key: 'hash-1',
      keyPrefix: 'ez_pk_live_abc',
      name: 'Test',
      userId: 'user-1',
      applicationId: 'app-1',
      appSlug: '  ACME  ',
      type: 'publishable',
      env: 'live',
    })
    await expect(doc.validate()).resolves.toBeUndefined()
    expect(doc.get('appSlug')).toBe('acme')
  })
})

// ---------------------------------------------------------------------------
// createApiKeyUsageSchema
// ---------------------------------------------------------------------------

describe('createApiKeyUsageSchema', () => {
  it('exposes the canonical fields', () => {
    const schema = createApiKeyUsageSchema()
    expect(Object.keys(schema.paths)).toEqual(
      expect.arrayContaining([
        'apiKeyId',
        'userId',
        'date',
        'requestCount',
        'endpoints',
        'createdAt',
      ])
    )
    // updatedAt is OFF by configuration
    expect(schema.paths).not.toHaveProperty('updatedAt')
  })

  it('uses the api_key_usage collection and disables bufferCommands', () => {
    const schema = createApiKeyUsageSchema()
    const opts = schema.options as { collection?: string; bufferCommands?: boolean }
    expect(opts.collection).toBe('api_key_usage')
    expect(opts.bufferCommands).toBe(false)
  })

  it('declares the unique daily bucket index + supporting indexes + TTL', () => {
    const schema = createApiKeyUsageSchema()
    const indexes = schema.indexes() as Array<[Record<string, number>, Record<string, unknown>?]>

    const unique = indexes.find(
      ([k, opts]) => k.apiKeyId === 1 && k.date === 1 && (opts as { unique?: boolean })?.unique
    )
    expect(unique).toBeDefined()

    const ttl = indexes.find(
      ([k, opts]) =>
        k.createdAt === 1 &&
        typeof (opts as { expireAfterSeconds?: number })?.expireAfterSeconds === 'number'
    )
    expect(ttl).toBeDefined()
    expect((ttl?.[1] as { expireAfterSeconds: number }).expireAfterSeconds).toBe(90 * 24 * 60 * 60)

    // Descending date index for monthly aggregations (ezpay improvement promoted to default).
    const descIndex = indexes.find(([k]) => k.apiKeyId === 1 && k.date === -1)
    expect(descIndex).toBeDefined()

    // Per-user index
    const userIndex = indexes.find(([k]) => k.userId === 1 && k.date === 1)
    expect(userIndex).toBeDefined()
  })

  it('uses createdAt timestamp only (no updatedAt)', () => {
    const schema = createApiKeyUsageSchema()
    const opts = schema.options as { timestamps?: { createdAt?: boolean; updatedAt?: boolean } }
    expect(opts.timestamps?.createdAt).toBe(true)
    expect(opts.timestamps?.updatedAt).toBe(false)
  })

  it('accepts a valid usage doc with defaults', async () => {
    const Model = makeUsageModel()
    const doc = new Model({
      apiKeyId: 'key-1',
      userId: 'user-1',
      date: '2026-04-20',
    })
    await expect(doc.validate()).resolves.toBeUndefined()
    expect(doc.get('requestCount')).toBe(0)
    const endpoints = doc.get('endpoints') as Map<string, number>
    expect(endpoints).toBeInstanceOf(Map)
    expect(endpoints.size).toBe(0)
  })

  it('rejects a usage doc missing required fields', async () => {
    const Model = makeUsageModel()
    const doc = new Model({})
    await expect(doc.validate()).rejects.toThrow()
  })
})

// Avoid TS unused-imports issues if Schema is not directly referenced.
void Schema
