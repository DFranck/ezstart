/**
 * Migration script — backfill `appRoles[slug] = ['admin']` for every owner of
 * an existing Application (EZ-AUTO-ROLES).
 *
 * Before this migration, `POST /applications` only appended the slug to
 * `user.apps[]` but did NOT seed `appRoles[slug]`. Downstream "is admin of
 * this app" checks therefore had to fetch the Application document and
 * compare `ownerId`, instead of reading the JWT's `appRoles` map directly.
 *
 * For each active or archived Application:
 * - If the owner's `appRoles[slug]` does not include `'admin'`, add it.
 * - Also ensure `slug` is in the owner's `apps[]`.
 *
 * The script is idempotent — running it twice yields zero changes on the
 * second pass. It is safe to re-run in every environment.
 *
 * Usage:
 *   pnpm --filter api-ezauth migrate:owner-admin-role
 */

import { Types } from 'mongoose'
import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getApplicationModel } from '../models/application.js'
import { getAuthUserModel } from '../models/auth-user.js'

export interface BackfillResult {
  /** Applications inspected. */
  applicationsScanned: number
  /** Users whose `appRoles[slug]` gained `'admin'`. */
  rolesAdded: number
  /** Users whose `apps[]` gained the slug. */
  appsAdded: number
  /**
   * Applications skipped because the owner cannot be resolved —
   * either the `ownerId` is not a valid ObjectId (e.g. the literal
   * `'system'` seeded by bootstrap scripts) or the owner document
   * no longer exists in `auth_users`.
   */
  missingOwners: number
}

/**
 * Core migration logic — extracted from the CLI entry point for testability.
 *
 * Assumes `connectToMongo('ezauth')` has been called.
 */
export async function backfillAppOwnerAdminRole(): Promise<BackfillResult> {
  const Application = await getApplicationModel()
  const AuthUser = await getAuthUserModel()

  const result: BackfillResult = {
    applicationsScanned: 0,
    rolesAdded: 0,
    appsAdded: 0,
    missingOwners: 0,
  }

  // Scan EVERY application — even archived ones keep an owner with rights.
  const apps = await Application.find({}, { slug: 1, ownerId: 1 }).lean()
  result.applicationsScanned = apps.length

  for (const app of apps) {
    const { slug, ownerId } = app
    if (!slug || !ownerId) continue

    // Skip non-ObjectId owners (e.g. `'system'` used by `seed-self-key.ts`)
    // — Mongoose would otherwise throw `CastError` on findById.
    if (!Types.ObjectId.isValid(ownerId)) {
      result.missingOwners += 1
      continue
    }

    const owner = await AuthUser.findById(ownerId).lean()
    if (!owner) {
      result.missingOwners += 1
      continue
    }

    // Normalize appRoles (Map vs plain object depending on driver flavor).
    const rolesRaw: unknown = owner.appRoles
    let currentRoles: string[] = []
    if (rolesRaw instanceof Map) {
      currentRoles = rolesRaw.get(slug) ?? []
    } else if (rolesRaw && typeof rolesRaw === 'object') {
      currentRoles = (rolesRaw as Record<string, string[]>)[slug] ?? []
    }

    const currentApps: string[] = Array.isArray(owner.apps) ? owner.apps : []
    const needsRole = !currentRoles.includes('admin')
    const needsApp = !currentApps.includes(slug)

    if (!needsRole && !needsApp) continue

    const update: Record<string, unknown> = {}
    if (needsRole) {
      update.$set = { [`appRoles.${slug}`]: Array.from(new Set([...currentRoles, 'admin'])) }
    }
    if (needsApp) {
      update.$addToSet = { apps: slug }
    }

    await AuthUser.updateOne({ _id: ownerId }, update)

    if (needsRole) result.rolesAdded += 1
    if (needsApp) result.appsAdded += 1
  }

  return result
}

/** CLI entry point — boots env, connects to MongoDB, runs the migration. */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezauth')
  await connectToMongo('ezauth')

  const result = await backfillAppOwnerAdminRole()

  console.info('')
  console.info('backfill-app-owner-admin-role result:')
  console.info(`  applications scanned: ${result.applicationsScanned}`)
  console.info(`  roles added:          ${result.rolesAdded}`)
  console.info(`  apps entries added:   ${result.appsAdded}`)
  console.info(`  missing owners:       ${result.missingOwners}`)
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
    console.error(`backfill-app-owner-admin-role failed: ${msg}`)
    process.exit(1)
  })
}
