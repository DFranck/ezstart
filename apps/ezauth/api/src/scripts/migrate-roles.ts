/**
 * Migration Script: Convert old `roles` to new `globalRoles` and `appRoles` structure
 *
 * Run with: node --loader ts-node/esm src/scripts/migrate-roles.ts
 */

import { connectToMongo } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'
import { getAuthUserModel } from '../models/auth-user.js'

async function migrateRoles() {
  try {
    // Extra safeguard: never run destructive scripts in production automatically.
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_MIGRATION) {
      throw new Error('Refusing to run migration in production without ALLOW_PROD_MIGRATION=1')
    }

    logger.info('🚀 Starting roles migration...')

    // Connect to MongoDB
    await connectToMongo('ezauth')
    const AuthUserModel = await getAuthUserModel()

    // Find all users
    const users = await AuthUserModel.find({})
    logger.info(`📊 Found ${users.length} users to migrate`)

    let migratedCount = 0
    let skippedCount = 0

    for (const user of users) {
      // Skip if already migrated (has globalRoles or appRoles)
      const hasAppRoles = user.appRoles && user.appRoles.size > 0
      if (user.globalRoles?.length > 0 || hasAppRoles) {
        logger.debug({ email: user.email }, '⏭️  Skipping — already migrated')
        skippedCount++
        continue
      }

      // Skip if no roles to migrate
      if (!user.roles || user.roles.length === 0) {
        logger.debug({ email: user.email }, '⏭️  Skipping — no roles to migrate')
        skippedCount++
        continue
      }

      logger.info({ email: user.email, roles: user.roles, apps: user.apps }, '🔄 Migrating user')

      // Check if user has superadmin role
      if (user.roles.includes('superadmin')) {
        user.globalRoles = ['superadmin']
        logger.debug({ email: user.email }, '✅ Set globalRoles to [superadmin]')
      }

      // Migrate other roles to app-specific roles
      const otherRoles = user.roles.filter(r => r !== 'superadmin')

      if (otherRoles.length > 0 && user.apps.length > 0) {
        if (!user.appRoles) {
          user.appRoles = new Map<string, string[]>()
        }

        for (const app of user.apps) {
          user.appRoles.set(app, otherRoles)
          logger.debug({ email: user.email, app, roles: otherRoles }, '✅ Set appRoles')
        }
      }

      await user.save()
      migratedCount++
    }

    logger.info(
      { migrated: migratedCount, skipped: skippedCount, total: users.length },
      '✅ Migration complete'
    )

    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, '❌ Migration failed')
    process.exit(1)
  }
}

migrateRoles()
