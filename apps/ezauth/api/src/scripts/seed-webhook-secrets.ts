/**
 * Seed script — backfill missing `webhookSecret` on existing Applications.
 *
 * Purpose: when the field was added to the `Application` schema (Stripe
 * `whsec_*` per-Application HMAC pattern), documents created BEFORE the
 * change have no value. Mongoose default factories fire on `.create()`
 * but NOT on existing rows, so a one-shot backfill is required.
 *
 * Idempotent:
 *   - Applications already carrying a `webhookSecret` are SKIPPED.
 *   - Applications missing the field receive a fresh `whsec_<64-hex>` and
 *     the document is saved in-place.
 *   - The script reports `seeded` / `already-set` counts on stdout. The
 *     secret values themselves are NEVER printed — only the count.
 *
 * Production safety: refuses to run when `NODE_ENV === 'production'`
 * UNLESS `--force` is passed on the CLI. Set the flag explicitly when
 * you intentionally want to backfill prod (e.g. immediately after
 * deploying the schema change). `data-protection.md` §3 requires this
 * gate for any script that mutates production data.
 *
 * Usage (dev/staging):
 *   pnpm --filter api-ezauth seed:webhook-secrets
 *
 * Usage (production):
 *   railway run --service ezauth-api --environment production -- \
 *     pnpm --filter api-ezauth seed:webhook-secrets --force
 *
 * After running this script in production:
 *   1. Open the ezauth dashboard, navigate to each Application's "Webhook"
 *      tab, click "Reveal webhook secret" (or query the DB directly).
 *   2. Set the value as `EZPAY_WEBHOOK_SECRET` on the consumer's API
 *      service (currently only `apps/ezauth/api` consumes its own webhook
 *      so it shares the value back with itself; future external consumers
 *      will host their own receivers and their own copy of the secret).
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { generateWebhookSecret, getApplicationModel } from '../models/application.js'

/** Per-Application backfill outcome. */
export interface WebhookSecretSeedResult {
  applicationId: string
  slug: string
  status: 'seeded' | 'already-set'
}

/**
 * Core seed logic — extracted from the CLI entry point for testability.
 *
 * Assumes a live Mongoose connection to the ezauth DB is available. The
 * caller (CLI `main()`) is responsible for `connectToMongo('ezauth')`.
 *
 * Iterates over EVERY Application (including archived — even if the app
 * itself is no longer in active use, leaving the document without a secret
 * would crash the webhook receiver if Stripe ever resurfaced an event for
 * a stale subscription pointing at it).
 *
 * Implementation note: Mongoose hydration applies the schema default for
 * `required` fields on read, which would mask the legacy state we are
 * trying to detect. We therefore go through the **raw collection**
 * (`.collection.find(...)` + `.updateOne(...)`) so the persisted state is
 * the only thing we evaluate.
 */
export async function seedWebhookSecrets(): Promise<WebhookSecretSeedResult[]> {
  const Application = await getApplicationModel()
  const results: WebhookSecretSeedResult[] = []

  // Use the raw collection — Mongoose's default-on-read behavior would
  // make a legacy doc (missing `webhookSecret`) look like it already has
  // one, defeating the backfill detection.
  const cursor = Application.collection.find({})

  for await (const raw of cursor) {
    const id = String(raw._id)
    const slug = String(raw.slug)
    const existing = raw.webhookSecret
    if (typeof existing === 'string' && existing.length > 0) {
      results.push({ applicationId: id, slug, status: 'already-set' })
      continue
    }

    const secret = generateWebhookSecret()
    await Application.collection.updateOne(
      { _id: raw._id },
      { $set: { webhookSecret: secret, updatedAt: new Date() } }
    )
    results.push({ applicationId: id, slug, status: 'seeded' })
  }

  return results
}

/**
 * CLI entry point. Connects to MongoDB, runs the backfill, prints a
 * summary block, and exits the process with code 0 (success) or 1
 * (failure / production guard).
 */
async function main(): Promise<void> {
  const force = process.argv.includes('--force')
  if (process.env.NODE_ENV === 'production' && !force) {
    console.error(
      'Refusing to run in production without --force. Pass --force explicitly to proceed.'
    )
    process.exit(1)
  }

  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const results = await seedWebhookSecrets()
  const seeded = results.filter(r => r.status === 'seeded')
  const skipped = results.filter(r => r.status === 'already-set')

  console.info('')
  console.info('=== webhookSecret backfill result ===')
  console.info('')
  console.info('  seeded:      ' + seeded.length)
  console.info('  already-set: ' + skipped.length)
  console.info('  total:       ' + results.length)
  console.info('')
  // Intentionally do NOT log the secret values — only the slugs that were
  // touched, so the operator can verify the right Applications were updated.
  for (const r of seeded) {
    console.info('  [seeded]      ' + r.slug)
  }
  console.info('')

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
    console.error('seed-webhook-secrets failed: ' + msg)
    process.exit(1)
  })
}
