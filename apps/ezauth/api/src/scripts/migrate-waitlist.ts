/**
 * Migration Script: Waitlist Model v1 → v2
 *
 * OLD FORMAT: { appName: string, emails: string[] }
 * NEW FORMAT: { appName: string, emails: WaitlistEntry[] }
 *
 * Run with: pnpm tsx src/scripts/migrate-waitlist.ts
 */

import { connectToMongo } from '@ezstart/express-core'
import mongoose from 'mongoose'

interface OldWaitlistDocument {
  appName: string
  emails: string[]
  createdAt: Date
  updatedAt: Date
}

interface NewWaitlistEntry {
  email: string
  status: 'pending' | 'invited' | 'activated' | 'rejected'
  accessCode: string | null
  invitedAt: Date | null
  invitedBy: string | null
  activatedAt: Date | null
  notes: string
  addedAt: Date
}

interface NewWaitlistDocument {
  appName: string
  emails: NewWaitlistEntry[]
  createdAt: Date
  updatedAt: Date
}

async function migrateWaitlist() {
  console.log('🚀 Starting Waitlist Migration v1 → v2\n')

  try {
    // Connect to MongoDB
    await connectToMongo('ezauth')
    console.log('✅ Connected to MongoDB\n')

    // Get the raw collection (bypass model validation)
    const db = mongoose.connection.db
    if (!db) {
      throw new Error('Database connection not established')
    }

    const collection = db.collection('app_waitlists')

    // Find all waitlist documents
    const waitlists = await collection.find({}).toArray()
    console.log(`📊 Found ${waitlists.length} waitlist(s) to migrate\n`)

    if (waitlists.length === 0) {
      console.log('ℹ️  No waitlists found. Nothing to migrate.')
      return
    }

    let migratedCount = 0
    let skippedCount = 0

    for (const waitlist of waitlists) {
      const appName = waitlist.appName
      const emails = waitlist.emails

      // Check if already migrated (emails is array of objects)
      if (emails.length > 0 && typeof emails[0] === 'object' && emails[0].status) {
        console.log(`⏭️  Skipping ${appName} - already migrated (${emails.length} entries)`)
        skippedCount++
        continue
      }

      // Migrate: string[] → WaitlistEntry[]
      const migratedEmails: NewWaitlistEntry[] = emails.map((email: string) => ({
        email: email.toLowerCase(),
        status: 'pending',
        accessCode: null,
        invitedAt: null,
        invitedBy: null,
        activatedAt: null,
        notes: '',
        addedAt: waitlist.createdAt || new Date(),
      }))

      // Update the document
      await collection.updateOne(
        { _id: waitlist._id },
        { $set: { emails: migratedEmails } }
      )

      console.log(`✅ Migrated ${appName}: ${emails.length} email(s)`)
      migratedCount++
    }

    console.log('\n📈 Migration Summary:')
    console.log(`   - Migrated: ${migratedCount}`)
    console.log(`   - Skipped: ${skippedCount}`)
    console.log(`   - Total: ${waitlists.length}`)
    console.log('\n✅ Migration completed successfully!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run migration
migrateWaitlist()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
