/**
 * Migration script — backfill `applicationId` on all ApiKey documents (P6).
 *
 * For each `ApiKey` without `applicationId`:
 * - Skip if `appName === '*'` (platform-wide, no tenant scope).
 * - Otherwise find-or-create `Application({slug: key.appName})` with
 *   `ownerId = key.userId`, `createdBy = 'migration-P6'`, `name = key.appName`.
 * - Update the key document with `applicationId = app._id`.
 *
 * The script is idempotent — running it twice yields zero changes on the
 * second pass. It is safe to re-run in every environment.
 *
 * Usage:
 *   pnpm --filter api-ezauth migrate:keys-to-apps
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { Types } from 'mongoose'
import { getApiKeyModel } from '../models/api-key.js'
import { getApplicationModel, APPLICATION_SLUG_REGEX } from '../models/application.js'

/** Provenance marker for Applications created by this migration. */
const MIGRATION_MARKER = 'migration-P6'

export interface MigrationResult {
  /** Applications created by this run (slug → id). */
  created: number
  /** Keys linked to an existing or newly-created Application. */
  linked: number
  /** Keys skipped because `appName === '*'`. */
  skipped: number
  /** Keys skipped because the slug was invalid (cannot become an Application). */
  invalidSlugs: number
}

/**
 * Core migration logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezauth')` has been called (or is called inside
 * via the factory functions).
 */
export async function migrateKeysToApplications(): Promise<MigrationResult> {
  const ApiKey = await getApiKeyModel()
  const Application = await getApplicationModel()

  const result: MigrationResult = {
    created: 0,
    linked: 0,
    skipped: 0,
    invalidSlugs: 0,
  }

  // Fetch keys missing `applicationId`. `{ $exists: false }` or `{ $eq: null }`.
  const keys = await ApiKey.find({
    $or: [{ applicationId: { $exists: false } }, { applicationId: null }],
  }).lean()

  for (const key of keys) {
    const slug = key.appName

    // Platform-wide key — no tenant scope, skip.
    if (!slug || slug === '*') {
      result.skipped += 1
      continue
    }

    // Defensive: if the legacy appName doesn't match our Application slug
    // regex, skip rather than create an invalid Application.
    if (!APPLICATION_SLUG_REGEX.test(slug)) {
      result.invalidSlugs += 1
      continue
    }

    // Find-or-create the Application.
    const existing = await Application.findOne({ slug }).lean()
    let appId: Types.ObjectId
    if (existing) {
      appId = existing._id as Types.ObjectId
    } else {
      const created = await Application.create({
        slug,
        name: slug,
        ownerId: key.userId,
        createdBy: MIGRATION_MARKER,
        status: 'active',
      })
      appId = created._id as Types.ObjectId
      result.created += 1
    }

    // Link the key.
    await ApiKey.updateOne({ _id: key._id }, { $set: { applicationId: appId } })
    result.linked += 1
  }

  return result
}

/** CLI entry point — boots env, connects to MongoDB, runs the migration. */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  // Resolve MONGO_URL template ({app}-{env} → ezauth) so connectToMongo
  // doesn't try to use the literal template string as the DB name.
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const result = await migrateKeysToApplications()

  console.info('')
  console.info('migrate-keys-to-applications result:')
  console.info(`  applications created: ${result.created}`)
  console.info(`  keys linked:          ${result.linked}`)
  console.info(`  keys skipped (*):     ${result.skipped}`)
  console.info(`  keys invalid slug:    ${result.invalidSlugs}`)
  console.info('')
  process.exit(0)
}

// Only run CLI bootstrap when executed directly, not when imported by tests.
const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  const entryUrl = new URL(`file://${entry.replace(/\\/g, '/')}`).href
  return import.meta.url === entryUrl
})()

if (invokedAsScript) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`migrate-keys-to-applications failed: ${msg}`)
    process.exit(1)
  })
}
