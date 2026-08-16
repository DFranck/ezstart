/**
 * Seed script — populate `Application.redirectUris` with the canonical OAuth
 * callback URLs for every first-party @ezstart app across all environments.
 *
 * Closes AUTH-OAUTH-REDIRECT-URI-SEED-001 — every Application document was
 * previously created with `redirectUris: []` (the safe default from the
 * Mongoose schema), which fails the HAC-HIGH-3 RFC 6749 §3.1.2 exact-match
 * check the moment a real OAuth flow starts. Until each tenant registers
 * its own URIs via the dashboard, the platform apps stay broken.
 *
 * For each Application slug listed in {@link FIRST_PARTY_APP_SLUGS}, this
 * script:
 *   - Resolves `${getWebUrl(slug, env)}/auth/callback` for every env in
 *     {@link CALLBACK_ENVIRONMENTS}.
 *   - Skips environments where the app has no URL configured (e.g.
 *     `asc-tcd` has no API but still has a web URL).
 *   - Merges the computed URLs with the Application's existing
 *     `redirectUris` array (de-duplicated; preserves any tenant-added entry).
 *   - Writes back only when the merged set DIFFERS from what's persisted.
 *
 * Idempotent: re-running on an Application that already has every canonical
 * URL is a no-op and reports `already-set`.
 *
 * Usage (local):
 *   pnpm --filter api-ezauth seed:redirect-uris
 *
 * For staging:
 *   railway run --service ezauth-api --environment staging -- \
 *     pnpm --filter api-ezauth seed:redirect-uris
 *
 * Standard reference: `.claude/rules/standard-saas-security.md` §3 (auth
 * allowlists) + `.claude/rules/standard-saas-cors.md` (3-tier policy).
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getWebUrl, URLS, type AppName, type Environment } from '@ezstart/config/urls'
import { getApplicationModel } from '../models/application.js'

/**
 * Slugs of every first-party @ezstart Application that may use OAuth. Source
 * of truth = `AppName` union in `@ezstart/config/urls`. Update both sides when
 * a new first-party app is added.
 */
export const FIRST_PARTY_APP_SLUGS: ReadonlyArray<AppName> = [
  'ezauth',
  'ezpay',
  'ezstart',
  'ezbill',
  'green-pulse',
  'fengshui',
  'asc-tcd',
  'gacha-analyzer',
]

/**
 * Environments to seed callback URLs for. We register `local`, `development`,
 * `staging`, and `production` so a single Application document works across
 * the full deploy chain (developer machine, Vercel preview, staging Railway,
 * prod). The DB carries the union; the OAuth runtime sends whichever the
 * client computed at click time.
 */
export const CALLBACK_ENVIRONMENTS: ReadonlyArray<Environment> = [
  'local',
  'development',
  'staging',
  'production',
]

/**
 * Path suffix for OAuth callbacks. Locale-less per RFC 6749 §3.1.2 (exact-
 * match allowlist) — the framework's i18n middleware resolves the locale at
 * render time from `Accept-Language` / `NEXT_LOCALE` cookie / pathname.
 */
const CALLBACK_PATH = '/auth/callback'

/**
 * Compute the canonical OAuth callback URLs for an app across all known
 * environments. Skips environments where the app has no URL configured.
 */
export function computeCanonicalRedirectUris(app: AppName): string[] {
  const webUrls = URLS[app].web
  const uris = new Set<string>()
  for (const env of CALLBACK_ENVIRONMENTS) {
    const base = webUrls[env]
    if (!base) continue
    uris.add(`${base}${CALLBACK_PATH}`)
  }
  // Belt-and-braces: also derive via `getWebUrl(app)` to catch any future
  // redirect logic baked into that helper (currently a passthrough).
  try {
    const fromHelper = `${getWebUrl(app)}${CALLBACK_PATH}`
    uris.add(fromHelper)
  } catch {
    // getWebUrl falls back to production internally; nothing to do.
  }
  return Array.from(uris)
}

/** Per-slug seed outcome. */
export interface RedirectUrisSeedResult {
  slug: string
  status: 'updated' | 'already-set' | 'not-found'
  /** Final `redirectUris` value after merge (empty for `not-found`). */
  redirectUris: string[]
  /** Count of NEW entries added during this run (0 for `already-set`). */
  added: number
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes a live Mongoose connection to the ezauth DB is available.
 *
 * @param onlySlug - When provided, only this slug is seeded (other apps are
 *   skipped silently). Used by tests + targeted re-runs.
 */
export async function seedApplicationRedirectUris(
  onlySlug?: string
): Promise<RedirectUrisSeedResult[]> {
  const Application = await getApplicationModel()
  const results: RedirectUrisSeedResult[] = []

  for (const slug of FIRST_PARTY_APP_SLUGS) {
    if (onlySlug && slug !== onlySlug) continue
    const existing = await Application.findOne({ slug })
    if (!existing) {
      results.push({ slug, status: 'not-found', redirectUris: [], added: 0 })
      continue
    }

    const canonical = computeCanonicalRedirectUris(slug)
    const current = existing.redirectUris ?? []
    // Union, de-duplicated, preserving any tenant-added entries first so
    // ordering is stable across runs (existing entries keep their slot).
    const merged: string[] = [...current]
    let added = 0
    for (const uri of canonical) {
      if (!merged.includes(uri)) {
        merged.push(uri)
        added += 1
      }
    }

    if (added === 0) {
      results.push({ slug, status: 'already-set', redirectUris: merged, added: 0 })
      continue
    }

    existing.redirectUris = merged
    await existing.save()
    results.push({ slug, status: 'updated', redirectUris: merged, added })
  }

  return results
}

/**
 * CLI entry point. Connects to MongoDB, seeds the redirectUris, prints a
 * summary block, and exits the process with code 0 (success) or 1 (failure).
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const results = await seedApplicationRedirectUris()

  const updated = results.filter(r => r.status === 'updated')
  const skipped = results.filter(r => r.status === 'already-set')
  const missing = results.filter(r => r.status === 'not-found')

  console.info('')
  console.info('=== Application.redirectUris seed result ===')
  console.info('')
  for (const r of updated) {
    console.info(`  [updated]      ${r.slug} (+${r.added} URI${r.added === 1 ? '' : 's'})`)
    for (const uri of r.redirectUris) {
      console.info(`                   - ${uri}`)
    }
  }
  for (const r of skipped) {
    console.info(`  [already-set]  ${r.slug} (${r.redirectUris.length} URIs registered)`)
  }
  for (const r of missing) {
    console.info(`  [not-found]    ${r.slug} (create Application first via seed:consumer-app-keys)`)
  }
  console.info('')

  if (missing.length > 0) {
    console.warn(
      `${missing.length} application(s) missing — run seed:consumer-app-keys first, then re-run this script.`
    )
  }

  process.exit(0)
}

// Only run CLI bootstrap when executed directly, not when imported by tests.
const invokedAsScript = ((): boolean => {
  const entry = process.argv[1]
  if (!entry) return false
  const normalized = entry.split('\\').join('/')
  const entryUrl = new URL(`file://${normalized}`).href
  return import.meta.url === entryUrl
})()

if (invokedAsScript) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`seed-application-redirect-uris failed: ${msg}`)
    process.exit(1)
  })
}
