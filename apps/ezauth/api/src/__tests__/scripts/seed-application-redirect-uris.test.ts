import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  seedApplicationRedirectUris,
  computeCanonicalRedirectUris,
  FIRST_PARTY_APP_SLUGS,
} from '../../scripts/seed-application-redirect-uris.js'
import { getApplicationModel } from '../../models/application.js'

type ApplicationModelT = Awaited<ReturnType<typeof getApplicationModel>>

describe('seed-application-redirect-uris script', () => {
  let Application: ApplicationModelT

  beforeAll(async () => {
    await setupTestDatabase()
    Application = await getApplicationModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Application.deleteMany({})
  })

  async function createApp(slug: string, redirectUris: string[] = []) {
    return Application.create({
      slug,
      name: slug,
      ownerId: 'system',
      createdBy: 'system-seed-test',
      status: 'active',
      isPlatformOwned: false,
      requireEmailVerification: false,
      isTestMode: false,
      redirectUris,
    })
  }

  describe('computeCanonicalRedirectUris (pure)', () => {
    it('returns the local + staging + production callback URLs for ezauth', () => {
      const uris = computeCanonicalRedirectUris('ezauth')
      expect(uris).toContain('http://localhost:6111/auth/callback')
      expect(uris).toContain('https://ezauth-git-staging-ezstart.vercel.app/auth/callback')
      expect(uris).toContain('https://ezauth.ezstart.xyz/auth/callback')
    })

    it('returns a locale-less callback path for every URL', () => {
      for (const slug of FIRST_PARTY_APP_SLUGS) {
        const uris = computeCanonicalRedirectUris(slug)
        for (const uri of uris) {
          expect(uri.endsWith('/auth/callback')).toBe(true)
          // No locale prefix — `/en/auth/callback`, `/fr/auth/callback` would
          // be wrong per RFC 6749 §3.1.2 (allowlist exact-match).
          expect(uri).not.toMatch(/\/[a-z]{2,3}\/auth\/callback$/)
        }
      }
    })

    it('returns unique URLs (no duplicates from getWebUrl fallback)', () => {
      for (const slug of FIRST_PARTY_APP_SLUGS) {
        const uris = computeCanonicalRedirectUris(slug)
        expect(new Set(uris).size).toBe(uris.length)
      }
    })
  })

  describe('seedApplicationRedirectUris (DB integration)', () => {
    it('populates redirectUris when the field is empty (`updated`)', async () => {
      await createApp('ezauth', [])

      const results = await seedApplicationRedirectUris('ezauth')

      expect(results).toHaveLength(1)
      expect(results[0]?.status).toBe('updated')
      expect(results[0]?.added).toBeGreaterThan(0)
      const updated = await Application.findOne({ slug: 'ezauth' }).lean()
      expect(updated?.redirectUris).toContain('http://localhost:6111/auth/callback')
      expect(updated?.redirectUris).toContain('https://ezauth.ezstart.xyz/auth/callback')
    })

    it('is idempotent — second run reports `already-set` and does not mutate', async () => {
      await createApp('ezauth', [])

      await seedApplicationRedirectUris('ezauth')
      const before = await Application.findOne({ slug: 'ezauth' }).lean()

      const second = await seedApplicationRedirectUris('ezauth')

      expect(second).toHaveLength(1)
      expect(second[0]?.status).toBe('already-set')
      expect(second[0]?.added).toBe(0)

      const after = await Application.findOne({ slug: 'ezauth' }).lean()
      expect(after?.redirectUris).toEqual(before?.redirectUris)
    })

    it('preserves tenant-added URIs and appends the canonical set', async () => {
      const tenantUri = 'https://custom.example.com/auth/callback'
      await createApp('ezauth', [tenantUri])

      const results = await seedApplicationRedirectUris('ezauth')

      expect(results[0]?.status).toBe('updated')
      const updated = await Application.findOne({ slug: 'ezauth' }).lean()
      expect(updated?.redirectUris).toContain(tenantUri)
      expect(updated?.redirectUris?.[0]).toBe(tenantUri) // preserved at original slot
      expect(updated?.redirectUris).toContain('http://localhost:6111/auth/callback')
    })

    it('reports `not-found` for missing Applications without throwing', async () => {
      const results = await seedApplicationRedirectUris()

      const missing = results.filter(r => r.status === 'not-found')
      expect(missing).toHaveLength(FIRST_PARTY_APP_SLUGS.length)
      for (const r of missing) {
        expect(r.added).toBe(0)
        expect(r.redirectUris).toEqual([])
      }
    })

    it('mixed run — some empty, some with canonical, some missing', async () => {
      await createApp('ezauth', []) // updated
      await createApp('ezpay', computeCanonicalRedirectUris('ezpay')) // already-set
      // every other slug → not-found

      const results = await seedApplicationRedirectUris()

      const byStatus = {
        updated: results.filter(r => r.status === 'updated').map(r => r.slug),
        'already-set': results.filter(r => r.status === 'already-set').map(r => r.slug),
        'not-found': results.filter(r => r.status === 'not-found').map(r => r.slug),
      }

      expect(byStatus.updated).toEqual(['ezauth'])
      expect(byStatus['already-set']).toEqual(['ezpay'])
      expect(byStatus['not-found'].sort()).toEqual(
        ['asc-tcd', 'ezbill', 'ezstart', 'fengshui', 'gacha-analyzer', 'green-pulse'].sort()
      )
    })

    it('only seeds first-party slugs — foreign tenants untouched', async () => {
      await createApp('ezauth', [])
      await createApp('external-tenant-xyz', [])

      await seedApplicationRedirectUris()

      const external = await Application.findOne({ slug: 'external-tenant-xyz' }).lean()
      expect(external?.redirectUris).toEqual([])
    })

    it('seeded URIs pass Application.redirectUris validator (http/https only)', async () => {
      await createApp('ezauth', [])

      const results = await seedApplicationRedirectUris('ezauth')
      const updated = await Application.findOne({ slug: 'ezauth' }).lean()

      expect(results[0]?.status).toBe('updated')
      for (const uri of updated?.redirectUris ?? []) {
        const parsed = new URL(uri)
        expect(['http:', 'https:'].includes(parsed.protocol)).toBe(true)
      }
    })
  })
})
