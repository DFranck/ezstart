import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import {
  seedPlatformOwnedFlag,
  EZSTART_OWNED_SLUGS,
} from '../../scripts/seed-platform-owned-flag.js'
import { getApplicationModel } from '../../models/application.js'

type ApplicationModelT = Awaited<ReturnType<typeof getApplicationModel>>

describe('seed-platform-owned-flag script', () => {
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

  async function createApp(slug: string, isPlatformOwned = false) {
    return Application.create({
      slug,
      name: slug,
      ownerId: 'system',
      createdBy: 'system-seed-test',
      status: 'active',
      isPlatformOwned,
    })
  }

  it('flags all EzStart-owned slugs when every Application exists and none are flagged', async () => {
    for (const slug of EZSTART_OWNED_SLUGS) await createApp(slug, false)

    const results = await seedPlatformOwnedFlag()

    expect(results).toHaveLength(EZSTART_OWNED_SLUGS.length)
    expect(results.every(r => r.status === 'updated')).toBe(true)

    const apps = await Application.find({}).lean()
    for (const app of apps) {
      expect(app.isPlatformOwned).toBe(true)
    }
  })

  it('is idempotent — second run produces only `already-set` outcomes', async () => {
    for (const slug of EZSTART_OWNED_SLUGS) await createApp(slug, false)

    await seedPlatformOwnedFlag()
    const second = await seedPlatformOwnedFlag()

    expect(second).toHaveLength(EZSTART_OWNED_SLUGS.length)
    expect(second.every(r => r.status === 'already-set')).toBe(true)
  })

  it('reports `not-found` for missing Applications and does not fail', async () => {
    // Only create some of the expected slugs.
    await createApp('ezauth', false)
    await createApp('ezpay', false)

    const results = await seedPlatformOwnedFlag()

    const found = results.filter(r => r.status === 'updated')
    const missing = results.filter(r => r.status === 'not-found')

    expect(found.map(r => r.slug).sort()).toEqual(['ezauth', 'ezpay'])
    expect(missing.length).toBe(EZSTART_OWNED_SLUGS.length - 2)
  })

  it('only updates Applications whose slug is in EZSTART_OWNED_SLUGS — foreign tenants untouched', async () => {
    await createApp('ezauth', false)
    await createApp('external-tenant-xyz', false)

    await seedPlatformOwnedFlag()

    const ezauth = await Application.findOne({ slug: 'ezauth' }).lean()
    const external = await Application.findOne({ slug: 'external-tenant-xyz' }).lean()

    expect(ezauth?.isPlatformOwned).toBe(true)
    expect(external?.isPlatformOwned).toBe(false)
  })

  it('mixed run — some already-flagged, some unflagged, some missing', async () => {
    await createApp('ezauth', true) // already-set
    await createApp('ezpay', false) // updated
    // ezstart, ezbill, green-pulse, fengshui, asc-tcd, gacha-analyzer = not-found

    const results = await seedPlatformOwnedFlag()

    const byStatus = {
      'already-set': results.filter(r => r.status === 'already-set').map(r => r.slug),
      updated: results.filter(r => r.status === 'updated').map(r => r.slug),
      'not-found': results.filter(r => r.status === 'not-found').map(r => r.slug),
    }

    expect(byStatus['already-set']).toEqual(['ezauth'])
    expect(byStatus.updated).toEqual(['ezpay'])
    expect(byStatus['not-found'].sort()).toEqual(
      ['asc-tcd', 'ezbill', 'ezstart', 'fengshui', 'gacha-analyzer', 'green-pulse'].sort()
    )
  })
})
