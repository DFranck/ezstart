// Run from apps/ezauth/api — fetches staging publishable keys + app ids
import { getApiKeyModel } from './dist/models/api-key.js'
import { getApplicationModel } from './dist/models/application.js'
import mongoose from 'mongoose'

async function main() {
  try {
    console.log('[fetch] Connecting...')
    const KeyModel = await getApiKeyModel()
    const AppModel = await getApplicationModel()
    console.log('[fetch] Connected, querying...')

    const keys = await KeyModel.find({
      appName: { $in: ['ezauth', 'ezpay'] },
      type: 'publishable',
      status: 'active',
    }).lean()

    console.log('\n=== PUBLISHABLE KEYS (staging) ===')
    for (const k of keys) {
      console.log(`${k.appName.toUpperCase()}_KEY=${k.prefix}`)
    }

    const apps = await AppModel.find({ slug: { $in: ['ezauth', 'ezpay'] } }).lean()
    console.log('\n=== APP IDs (staging) ===')
    for (const a of apps) {
      console.log(`${a.slug.toUpperCase()}_APP_ID=${a._id}`)
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (e) {
    console.error('[fetch] ERROR:', e.message)
    console.error(e.stack)
    process.exit(1)
  }
}

main()
