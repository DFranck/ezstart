import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { appToEnvSuffix, getJwtSecret, getMongoUrl, getSentryDsn } from '../env-resolvers.js'

describe('@ezstart/config - env-resolvers', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset between tests
    for (const key of Object.keys(process.env)) {
      if (
        key.startsWith('MONGO_URL') ||
        key.startsWith('JWT_SECRET') ||
        key.startsWith('SENTRY_DSN') ||
        key === 'DEPLOY_ENV'
      ) {
        delete process.env[key]
      }
    }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('appToEnvSuffix', () => {
    it('uppercases simple names', () => {
      expect(appToEnvSuffix('ezbill')).toBe('EZBILL')
      expect(appToEnvSuffix('ezauth')).toBe('EZAUTH')
    })

    it('converts dashes to underscores', () => {
      expect(appToEnvSuffix('green-pulse')).toBe('GREEN_PULSE')
      expect(appToEnvSuffix('gacha-analyzer')).toBe('GACHA_ANALYZER')
      expect(appToEnvSuffix('asc-tcd')).toBe('ASC_TCD')
    })
  })

  describe('getMongoUrl', () => {
    it('throws when MONGO_URL is not set', () => {
      expect(() => getMongoUrl('ezbill')).toThrow(/MONGO_URL/)
    })

    it('interpolates {app} and {env} for local environment', () => {
      process.env.MONGO_URL = 'mongodb+srv://user:pw@host/{app}-{env}?retryWrites=true'
      process.env.DEPLOY_ENV = 'local'

      expect(getMongoUrl('ezbill')).toBe('mongodb+srv://user:pw@host/ezbill-dev?retryWrites=true')
      expect(getMongoUrl('green-pulse')).toBe(
        'mongodb+srv://user:pw@host/green-pulse-dev?retryWrites=true'
      )
    })

    it('uses staging suffix when DEPLOY_ENV=staging', () => {
      process.env.MONGO_URL = 'mongodb+srv://user:pw@host/{app}-{env}'
      process.env.DEPLOY_ENV = 'staging'

      expect(getMongoUrl('ezauth')).toBe('mongodb+srv://user:pw@host/ezauth-staging')
    })

    it('uses prod suffix when DEPLOY_ENV=production', () => {
      process.env.MONGO_URL = 'mongodb+srv://user:pw@host/{app}-{env}'
      process.env.DEPLOY_ENV = 'production'

      expect(getMongoUrl('ezpay')).toBe('mongodb+srv://user:pw@host/ezpay-prod')
    })

    it('keeps the URL unchanged when it has no placeholders', () => {
      process.env.MONGO_URL = 'mongodb://localhost:27017/manual-db'
      process.env.DEPLOY_ENV = 'local'

      expect(getMongoUrl('ezbill')).toBe('mongodb://localhost:27017/manual-db')
    })

    it('replaces multiple occurrences of a placeholder', () => {
      process.env.MONGO_URL = 'mongodb://host/{app}?replicaSet={app}'
      process.env.DEPLOY_ENV = 'local'

      expect(getMongoUrl('ezbill')).toBe('mongodb://host/ezbill?replicaSet=ezbill')
    })
  })

  describe('getJwtSecret', () => {
    it('throws when JWT_SECRET is not set', () => {
      expect(() => getJwtSecret()).toThrow(/JWT_SECRET/)
    })

    it('returns the JWT_SECRET value', () => {
      process.env.JWT_SECRET = 'my-super-secret-value'
      expect(getJwtSecret()).toBe('my-super-secret-value')
    })
  })

  describe('getSentryDsn', () => {
    it('returns undefined when nothing is configured', () => {
      expect(getSentryDsn('ezbill')).toBeUndefined()
    })

    it('reads per-app suffixed DSN when available', () => {
      process.env.SENTRY_DSN_EZBILL = 'https://ezbill-dsn@sentry.io/1'
      process.env.SENTRY_DSN_EZAUTH = 'https://ezauth-dsn@sentry.io/2'

      expect(getSentryDsn('ezbill')).toBe('https://ezbill-dsn@sentry.io/1')
      expect(getSentryDsn('ezauth')).toBe('https://ezauth-dsn@sentry.io/2')
    })

    it('honors kebab→underscore conversion for app names', () => {
      process.env.SENTRY_DSN_GREEN_PULSE = 'https://gp-dsn@sentry.io/3'

      expect(getSentryDsn('green-pulse')).toBe('https://gp-dsn@sentry.io/3')
    })

    it('falls back to generic SENTRY_DSN when app-specific is absent', () => {
      process.env.SENTRY_DSN = 'https://fallback@sentry.io/0'

      expect(getSentryDsn('ezbill')).toBe('https://fallback@sentry.io/0')
    })

    it('prefers app-specific DSN over generic fallback', () => {
      process.env.SENTRY_DSN = 'https://fallback@sentry.io/0'
      process.env.SENTRY_DSN_EZBILL = 'https://ezbill-dsn@sentry.io/1'

      expect(getSentryDsn('ezbill')).toBe('https://ezbill-dsn@sentry.io/1')
    })
  })
})
