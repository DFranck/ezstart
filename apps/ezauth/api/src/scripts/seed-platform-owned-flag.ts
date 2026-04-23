/**
 * Seed script — flag EzStart-owned Applications as `isPlatformOwned=true`.
 *
 * Purpose: enables the dogfood path in {@link hasFeature} (see
 * `@ezstart/auth-sdk/server/features`). When the feature helper is asked
 * whether a feature is available for an Application and the Application is
 * flagged platform-owned, the answer is ALWAYS `true` — the platform never
 * needs to pay itself for its own capabilities.
 *
 * Idempotent:
 *   - Applications missing the flag (or `isPlatformOwned=false`) are updated
 *     to `true`.
 *   - Applications that are ALREADY `isPlatformOwned=true` are left untouched.
 *   - Missing Applications (slug not present in DB) are reported as
 *     `not-found` and SKIPPED — they must be created upstream by
 *     `seed:consumer-app-keys` or `seed:self-key` first.
 *
 * Usage:
 *   pnpm --filter api-ezauth seed:platform-owned
 *
 * For staging:
 *   railway run --service ezauth-api --environment staging -- \
 *     pnpm --filter api-ezauth seed:platform-owned
 *
 * Later rotations: this flag CAN be toggled back to `false` through a future
 * superadmin-only API route (e.g. `PATCH /admin/applications/:id/platform`).
 * Today it is write-only via this script, intentionally — to avoid accidental
 * Pro-bypass grants via the normal dashboard UI.
 *
 * Standard reference: `.claude/rules/standard-saas-keys.md` §3 (Dogfood) +
 * `.claude/rules/standard.md` §0 (least-primitive wins — platform-owned short
 * circuit is the least-primitive answer to "is this app entitled to feature
 * X?").
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getApplicationModel } from '../models/application.js'

/**
 * Slugs that belong to EzStart LLC itself — every app under the `apps/`
 * workspace in this monorepo. Update this list when a new first-party app is
 * added.
 */
export const EZSTART_OWNED_SLUGS: ReadonlyArray<string> = [
  'ezauth',
  'ezpay',
  'ezstart',
  'ezbill',
  'green-pulse',
  'fengshui',
  'asc-tcd',
  'gacha-analyzer',
]

/** Per-slug seed outcome. */
export interface PlatformOwnedSeedResult {
  slug: string
  status: 'updated' | 'already-set' | 'not-found'
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes a live Mongoose connection to the ezauth DB is available.
 */
export async function seedPlatformOwnedFlag(): Promise<PlatformOwnedSeedResult[]> {
  const Application = await getApplicationModel()
  const results: PlatformOwnedSeedResult[] = []

  for (const slug of EZSTART_OWNED_SLUGS) {
    const existing = await Application.findOne({ slug })

    if (!existing) {
      results.push({ slug, status: 'not-found' })
      continue
    }

    if (existing.isPlatformOwned === true) {
      results.push({ slug, status: 'already-set' })
      continue
    }

    existing.isPlatformOwned = true
    await existing.save()
    results.push({ slug, status: 'updated' })
  }

  return results
}

/**
 * CLI entry point. Connects to MongoDB, seeds the flags, prints a summary
 * block, and exits the process with code 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const results = await seedPlatformOwnedFlag()

  const updated = results.filter(r => r.status === 'updated')
  const skipped = results.filter(r => r.status === 'already-set')
  const missing = results.filter(r => r.status === 'not-found')

  console.info('')
  console.info('=== isPlatformOwned seed result ===')
  console.info('')
  for (const r of updated) {
    console.info('  [updated]      ' + r.slug)
  }
  for (const r of skipped) {
    console.info('  [already-set]  ' + r.slug)
  }
  for (const r of missing) {
    console.info(
      '  [not-found]    ' + r.slug + ' (create Application first via seed:consumer-app-keys)'
    )
  }
  console.info('')

  if (missing.length > 0) {
    console.warn(
      missing.length +
        ' application(s) missing - run seed:consumer-app-keys first, then re-run this script.'
    )
  }

  process.exit(0)
}

// Only run CLI bootstrap when executed directly, not when imported by tests.
const invokedAsScript = ((): boolean => {
  const entry = process.argv[1]
  if (!entry) return false
  const normalized = entry.split('\\').join('/')
  const entryUrl = new URL('file://' + normalized).href
  return import.meta.url === entryUrl
})()

if (invokedAsScript) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('seed-platform-owned-flag failed: ' + msg)
    process.exit(1)
  })
}
