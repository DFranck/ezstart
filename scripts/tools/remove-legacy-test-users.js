#!/usr/bin/env node
/**
 * One-off helper to LIST legacy per-app test users left over from before the
 * single TEST_GLOBAL super admin migration.
 *
 * - Connects to the `ezauth` MongoDB DB via @ezstart/express-core.
 * - Lists users matching legacy fixture patterns (test-ezbill@..., test-ezpay@...).
 * - EXCLUDES test-global@ezstart.dev (the kept super admin).
 * - Does NOT delete anything — prints the list so a human can review and
 *   purge manually with a targeted query.
 *
 * Guarded against running in production per .claude/rules/data-protection.md.
 *
 * Usage:
 *   node scripts/tools/remove-legacy-test-users.js
 */

const path = require('path')

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    '[remove-legacy-test-users] Refusing to run with NODE_ENV=production. This script is dev/staging only.'
  )
}

async function main() {
  // Load root .env.local + resolve the ezauth MongoDB URL via the generic
  // template (MONGO_URL in root contains {app}/{env} placeholders).
  const { loadSharedEnv } = require(
    path.resolve(__dirname, '..', '..', 'packages', 'config', 'dist', 'server.js')
  )
  const { getMongoUrl } = require(
    path.resolve(__dirname, '..', '..', 'packages', 'config', 'dist', 'env-resolvers.js')
  )
  loadSharedEnv({ app: 'ezauth', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezauth')

  const { connectToMongo } = require(
    path.resolve(__dirname, '..', '..', 'packages', 'express-core', 'dist', 'index.js')
  )

  const mongoose = await connectToMongo('ezauth')

  const LEGACY_RE = /^test-(ezauth|ezbill|ezpay|ezstart|green-?pulse|gacha|fengshui)@ezstart\.dev$/i

  const users = await mongoose.connection
    .collection('users')
    .find({ email: { $regex: LEGACY_RE, $ne: 'test-global@ezstart.dev' } })
    .project({ email: 1, username: 1, createdAt: 1 })
    .toArray()

  if (users.length === 0) {
    console.log('No legacy per-app test users found. Nothing to clean.')
  } else {
    console.log(`Found ${users.length} legacy per-app test user(s):\n`)
    for (const u of users) {
      console.log(
        `  - ${u.email}  (username=${u.username}, _id=${u._id}, createdAt=${u.createdAt})`
      )
    }
    console.log(
      '\nReview the list. To delete, run a targeted query manually, e.g.:\n' +
        "  db.users.deleteMany({ email: { $in: ['test-ezbill@ezstart.dev', 'test-ezpay@ezstart.dev'] } })\n" +
        'NEVER run deleteMany({}) — see .claude/rules/data-protection.md.'
    )
  }

  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
