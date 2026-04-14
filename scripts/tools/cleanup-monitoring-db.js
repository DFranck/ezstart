#!/usr/bin/env node
/**
 * One-off cleanup for the stale `ezstart-monitoring` MongoDB database.
 *
 * Context:
 *   `connectToMongo('ezstart-monitoring')` was silently ignored because the
 *   ezstart API had already connected to `ezstart`. All healthcheck writes
 *   landed in `ezstart.healthchecks`. The `ezstart-monitoring` DB is empty.
 *
 * This script:
 *   1. Drops every collection in `ezstart-monitoring` (fallback if we lack
 *      the Atlas `dropDatabase` role).
 *   2. Drops the database itself when possible.
 *   3. Ensures `ezstart.healthchecks` has a TTL index of 7 days on `timestamp`.
 *
 * Guarded against running in production per .claude/rules/data-protection.md.
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   node scripts/tools/cleanup-monitoring-db.js
 */

const path = require('path')

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    '[cleanup-monitoring-db] Refusing to run with NODE_ENV=production. Dev/staging only.'
  )
}

const TTL_INDEX_NAME = 'ttl_7d'
const TTL_SECONDS = 7 * 24 * 60 * 60 // 604800
const STALE_DB = 'ezstart-monitoring'
const TARGET_DB = 'ezstart'
const TTL_COLLECTION = 'healthchecks'

async function main() {
  // Load root .env.local so EZAUTH_MONGO_URL resolves (loader strips the prefix).
  const { loadSharedEnv } = require(
    path.resolve(__dirname, '..', '..', 'packages', 'config', 'dist', 'server.js')
  )
  loadSharedEnv({ app: 'ezauth', layer: 'api' })

  const MONGO_URL = process.env.MONGO_URL
  if (!MONGO_URL) {
    throw new Error(
      '[cleanup-monitoring-db] MONGO_URL not set after loading root .env.local (expected EZAUTH_MONGO_URL).'
    )
  }

  // Mongoose is hoisted inside express-core's node_modules in this pnpm workspace.
  const mongoose = require(
    path.resolve(__dirname, '..', '..', 'packages', 'express-core', 'node_modules', 'mongoose')
  )

  await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 15000 })
  console.log(`[cleanup-monitoring-db] Connected to cluster.`)

  const client = mongoose.connection.getClient()

  try {
    // --- Step 1: drop stale `ezstart-monitoring` database ---
    const staleDb = client.db(STALE_DB)
    const staleCollections = await staleDb.listCollections({}, { nameOnly: true }).toArray()

    if (staleCollections.length === 0) {
      console.log(`[cleanup-monitoring-db] DB '${STALE_DB}' has no collections.`)
    } else {
      console.log(
        `[cleanup-monitoring-db] DB '${STALE_DB}' has ${staleCollections.length} collection(s):`
      )
      for (const { name } of staleCollections) {
        try {
          await staleDb.collection(name).drop()
          console.log(`  - Dropped ${STALE_DB}.${name}`)
        } catch (err) {
          if (err && err.codeName === 'NamespaceNotFound') {
            console.log(`  - ${STALE_DB}.${name} already gone`)
          } else {
            console.warn(
              `  - Failed to drop ${STALE_DB}.${name}: ${err instanceof Error ? err.message : String(err)}`
            )
          }
        }
      }
    }

    // Try dropping the database itself (may fail on restricted Atlas roles).
    try {
      const dropped = await staleDb.dropDatabase()
      if (dropped) {
        console.log(`[cleanup-monitoring-db] Dropped database '${STALE_DB}'.`)
      } else {
        console.log(
          `[cleanup-monitoring-db] dropDatabase('${STALE_DB}') returned false (may already be gone).`
        )
      }
    } catch (err) {
      console.warn(
        `[cleanup-monitoring-db] Could not dropDatabase('${STALE_DB}') (likely lacking admin role). ` +
          `Collections already dropped, DB will disappear once empty. Error: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    // --- Step 2: ensure 7-day TTL index on ezstart.healthchecks ---
    const targetDb = client.db(TARGET_DB)
    const collections = await targetDb
      .listCollections({ name: TTL_COLLECTION }, { nameOnly: true })
      .toArray()

    if (collections.length === 0) {
      console.log(
        `[cleanup-monitoring-db] Collection '${TARGET_DB}.${TTL_COLLECTION}' does not exist yet — skipping TTL index.`
      )
    } else {
      const coll = targetDb.collection(TTL_COLLECTION)
      const indexes = await coll.indexes()
      const ttlIndexes = indexes.filter(
        ix => ix.expireAfterSeconds !== undefined && ix.key && ix.key.timestamp !== undefined
      )

      let alreadyCorrect = false
      for (const ix of ttlIndexes) {
        if (ix.expireAfterSeconds === TTL_SECONDS && ix.name === TTL_INDEX_NAME) {
          alreadyCorrect = true
          continue
        }
        try {
          await coll.dropIndex(ix.name)
          console.log(
            `[cleanup-monitoring-db] Dropped stale TTL index '${ix.name}' (expireAfterSeconds=${ix.expireAfterSeconds}).`
          )
        } catch (err) {
          console.warn(
            `[cleanup-monitoring-db] Failed to drop TTL index '${ix.name}': ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }

      if (alreadyCorrect) {
        console.log(
          `[cleanup-monitoring-db] TTL index '${TTL_INDEX_NAME}' already correct on '${TARGET_DB}.${TTL_COLLECTION}'.`
        )
      } else {
        await coll.createIndex(
          { timestamp: 1 },
          { expireAfterSeconds: TTL_SECONDS, name: TTL_INDEX_NAME }
        )
        console.log(
          `[cleanup-monitoring-db] Created TTL index '${TTL_INDEX_NAME}' (expireAfterSeconds=${TTL_SECONDS}) on '${TARGET_DB}.${TTL_COLLECTION}'.`
        )
      }

      const count = await coll.countDocuments()
      console.log(
        `[cleanup-monitoring-db] '${TARGET_DB}.${TTL_COLLECTION}' currently has ${count} document(s).`
      )
    }

    // --- Final state snapshot ---
    const adminDbs = await client.db().admin().listDatabases()
    const staleStillThere = adminDbs.databases.find(d => d.name === STALE_DB)
    const targetStillThere = adminDbs.databases.find(d => d.name === TARGET_DB)
    console.log(`[cleanup-monitoring-db] Final state:`)
    console.log(
      `  - '${STALE_DB}': ${staleStillThere ? `still listed (${staleStillThere.sizeOnDisk} bytes)` : 'gone'}`
    )
    console.log(
      `  - '${TARGET_DB}': ${targetStillThere ? `present (${targetStillThere.sizeOnDisk} bytes)` : 'missing'}`
    )
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
