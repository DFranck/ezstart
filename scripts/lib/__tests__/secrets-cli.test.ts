/**
 * Unit tests for `scripts/lib/secrets-cli.ts` — runs with the built-in
 * Node test runner (node --test) via tsx so it needs no extra deps.
 *
 * Run:
 *   pnpm tsx --test scripts/lib/__tests__/secrets-cli.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isPlatformVar, PLATFORM_VAR_PATTERNS } from '../secrets-cli.js'

describe('isPlatformVar', () => {
  describe('Vercel platform-injected vars', () => {
    it('matches VERCEL_OIDC_TOKEN', () => {
      assert.equal(isPlatformVar('VERCEL_OIDC_TOKEN'), true)
    })

    it('matches VERCEL_GIT_COMMIT_SHA', () => {
      assert.equal(isPlatformVar('VERCEL_GIT_COMMIT_SHA'), true)
    })

    it('matches VERCEL_ENV, VERCEL_URL, VERCEL_REGION, VERCEL_TARGET_ENV', () => {
      assert.equal(isPlatformVar('VERCEL_ENV'), true)
      assert.equal(isPlatformVar('VERCEL_URL'), true)
      assert.equal(isPlatformVar('VERCEL_REGION'), true)
      assert.equal(isPlatformVar('VERCEL_TARGET_ENV'), true)
    })

    it('matches VERCEL_PROJECT_PRODUCTION_URL (any VERCEL_PROJECT_* suffix)', () => {
      assert.equal(isPlatformVar('VERCEL_PROJECT_PRODUCTION_URL'), true)
    })
  })

  describe('Railway platform-injected vars', () => {
    it('matches RAILWAY_PRIVATE_DOMAIN', () => {
      assert.equal(isPlatformVar('RAILWAY_PRIVATE_DOMAIN'), true)
    })

    it('matches RAILWAY_PROJECT_ID / RAILWAY_SERVICE_NAME', () => {
      assert.equal(isPlatformVar('RAILWAY_PROJECT_ID'), true)
      assert.equal(isPlatformVar('RAILWAY_SERVICE_NAME'), true)
    })

    it('matches RAILWAY_ENVIRONMENT_ID / RAILWAY_ENVIRONMENT_NAME', () => {
      assert.equal(isPlatformVar('RAILWAY_ENVIRONMENT_ID'), true)
      assert.equal(isPlatformVar('RAILWAY_ENVIRONMENT_NAME'), true)
    })

    it('does NOT match RAILWAY_TOKEN (user-set, in VAR_TARGETS)', () => {
      assert.equal(isPlatformVar('RAILWAY_TOKEN'), false)
    })
  })

  describe('Tooling (Turbo / Nx / Nixpacks / pnpm)', () => {
    it('matches TURBO_CACHE and TURBO_*', () => {
      assert.equal(isPlatformVar('TURBO_CACHE'), true)
      assert.equal(isPlatformVar('TURBO_RUN_SUMMARY'), true)
      assert.equal(isPlatformVar('TURBO_DOWNLOAD_LOCAL_ENABLED'), true)
    })

    it('matches NX_DAEMON', () => {
      assert.equal(isPlatformVar('NX_DAEMON'), true)
    })

    it('matches NIXPACKS_METADATA', () => {
      assert.equal(isPlatformVar('NIXPACKS_METADATA'), true)
    })

    it('matches NODE_VERSION / PNPM_HOME / PNPM_VERSION', () => {
      assert.equal(isPlatformVar('NODE_VERSION'), true)
      assert.equal(isPlatformVar('PNPM_HOME'), true)
      assert.equal(isPlatformVar('PNPM_VERSION'), true)
    })
  })

  describe('System vars', () => {
    it('matches PATH, HOME, USER, SHELL', () => {
      assert.equal(isPlatformVar('PATH'), true)
      assert.equal(isPlatformVar('HOME'), true)
      assert.equal(isPlatformVar('USER'), true)
      assert.equal(isPlatformVar('SHELL'), true)
    })
  })

  describe('Real user-set vars (must NOT be filtered)', () => {
    it('does NOT match JWT_SECRET', () => {
      assert.equal(isPlatformVar('JWT_SECRET'), false)
    })

    it('does NOT match MONGO_URL', () => {
      assert.equal(isPlatformVar('MONGO_URL'), false)
    })

    it('does NOT match NEXT_PUBLIC_APP_NAME', () => {
      assert.equal(isPlatformVar('NEXT_PUBLIC_APP_NAME'), false)
    })

    it('does NOT match SENTRY_DSN / SENTRY_DSN_EZAUTH', () => {
      assert.equal(isPlatformVar('SENTRY_DSN'), false)
      assert.equal(isPlatformVar('SENTRY_DSN_EZAUTH'), false)
    })

    it('does NOT match STRIPE_SECRET_KEY / VERCEL_TOKEN / VERCEL_TEAM_ID', () => {
      assert.equal(isPlatformVar('STRIPE_SECRET_KEY'), false)
      assert.equal(isPlatformVar('VERCEL_TOKEN'), false)
      assert.equal(isPlatformVar('VERCEL_TEAM_ID'), false)
    })
  })

  describe('PLATFORM_VAR_PATTERNS shape', () => {
    it('is a non-empty readonly array of RegExp', () => {
      assert.ok(Array.isArray(PLATFORM_VAR_PATTERNS))
      assert.ok(PLATFORM_VAR_PATTERNS.length > 0)
      for (const re of PLATFORM_VAR_PATTERNS) {
        assert.ok(re instanceof RegExp)
      }
    })
  })
})
