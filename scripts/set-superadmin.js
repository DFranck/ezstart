/**
 * Script to grant superadmin role to a user
 * Usage: node scripts/set-superadmin.js <email>
 * Example: node scripts/set-superadmin.js user@example.com
 */

import { MongoClient } from 'mongodb'

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
const DB_NAME = 'ezauth'

async function setSuperadmin(email) {
  if (!email) {
    console.error('❌ Error: Email is required')
    console.log('Usage: node scripts/set-superadmin.js <email>')
    console.log('Example: node scripts/set-superadmin.js user@example.com')
    process.exit(1)
  }

  const client = new MongoClient(MONGO_URL)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')

    const db = client.db(DB_NAME)
    const users = db.collection('auth_users')

    // Find user
    const user = await users.findOne({ email: email.toLowerCase() })
    if (!user) {
      console.error(`❌ User not found with email: ${email}`)
      process.exit(1)
    }

    console.log(`\n📋 Current user info:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Username: ${user.username}`)
    console.log(`   Current roles: ${JSON.stringify(user.roles || [])}`)
    console.log(`   Current permissions: ${JSON.stringify(user.permissions || [])}`)
    console.log(`   Current features: ${JSON.stringify(user.features || [])}`)

    // Update user with superadmin role
    const result = await users.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          roles: ['superadmin'],
          permissions: [],
          features: [],
        },
      }
    )

    if (result.modifiedCount > 0) {
      console.log(`\n✅ SUCCESS! Superadmin role granted to ${email}`)
      console.log(`\n📋 Updated user info:`)
      console.log(`   Roles: ["superadmin"]`)
      console.log(`   Permissions: [] (superadmin has all permissions automatically)`)
      console.log(`   Features: [] (superadmin has all features automatically)`)
      console.log(`\n⚠️  IMPORTANT: User must logout and login again to refresh their JWT token!`)
    } else {
      console.log(`\n⚠️  No changes made (user may already have superadmin role)`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

// Get email from command line arguments
const email = process.argv[2]
setSuperadmin(email)
