/**
 * Migration Script: Convert old `roles` to new `globalRoles` and `appRoles` structure
 *
 * Run with: node --loader ts-node/esm src/scripts/migrate-roles.ts
 */

import { connectToMongo } from '@ezstart/express-core'
import { getAuthUserModel } from '../models/auth-user.js'

async function migrateRoles() {
  try {
    console.log('🚀 Starting roles migration...\n')

    // Connect to MongoDB
    await connectToMongo('ezauth')
    const AuthUserModel = await getAuthUserModel()

    // Find all users
    const users = await AuthUserModel.find({})
    console.log(`📊 Found ${users.length} users to migrate\n`)

    let migratedCount = 0
    let skippedCount = 0

    for (const user of users) {
      // Skip if already migrated (has globalRoles or appRoles)
      const hasAppRoles = user.appRoles && user.appRoles.size > 0
      if (user.globalRoles?.length > 0 || hasAppRoles) {
        console.log(`⏭️  Skipping ${user.email} - already migrated`)
        skippedCount++
        continue
      }

      // Skip if no roles to migrate
      if (!user.roles || user.roles.length === 0) {
        console.log(`⏭️  Skipping ${user.email} - no roles to migrate`)
        skippedCount++
        continue
      }

      console.log(`\n🔄 Migrating ${user.email}...`)
      console.log(`   Current roles: ${user.roles.join(', ')}`)
      console.log(`   Apps: ${user.apps.join(', ')}`)

      // Check if user has superadmin role
      if (user.roles.includes('superadmin')) {
        user.globalRoles = ['superadmin']
        console.log(`   ✅ Set globalRoles: ['superadmin']`)
      }

      // Migrate other roles to app-specific roles
      const otherRoles = user.roles.filter(r => r !== 'superadmin')

      if (otherRoles.length > 0 && user.apps.length > 0) {
        // Initialize appRoles Map if not exists
        if (!user.appRoles) {
          user.appRoles = new Map<string, string[]>()
        }

        // Assign roles to all apps user has access to
        for (const app of user.apps) {
          user.appRoles.set(app, otherRoles)
          console.log(`   ✅ Set appRoles['${app}']: [${otherRoles.join(', ')}]`)
        }
      }

      // Save user
      await user.save()
      migratedCount++
      console.log(`   💾 Saved!`)
    }

    console.log(`\n\n✅ Migration complete!`)
    console.log(`   Migrated: ${migratedCount} users`)
    console.log(`   Skipped: ${skippedCount} users`)
    console.log(`   Total: ${users.length} users`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateRoles()
