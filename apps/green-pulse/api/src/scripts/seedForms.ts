/**
 * Seed script to populate FormConfig collection with example forms
 * Usage: pnpm tsx src/scripts/seedForms.ts
 */

import { connectToMongo } from '@ezstart/express-core'
import { getFormConfigModel } from '../models/FormConfig.js'
import { FORM_CONFIGS } from '../seeds/formConfigs.js'

async function seedForms() {
  try {
    console.log('🌱 Starting form configs seed...')

    // Connect to MongoDB
    await connectToMongo('green-pulse')
    console.log('✅ Connected to MongoDB')

    // Get model
    const FormConfig = await getFormConfigModel()

    // Clear existing configs (optional - comment out if you want to keep existing)
    // await FormConfig.deleteMany({})
    // console.log('🗑️  Cleared existing form configs')

    // Insert seed data
    const results: any[] = []
    for (const config of FORM_CONFIGS) {
      try {
        // Check if config already exists
        // @ts-expect-error - Mongoose type inference issue
        const existing = await FormConfig.findOne({ id: config.id })
        if (existing) {
          console.log(`⏭️  Skipping ${config.id} (already exists)`)
          continue
        }

        // Insert new config
        const newConfig = new FormConfig(config)
        await newConfig.save()
        results.push(newConfig)
        console.log(`✅ Created form config: ${config.name} (${config.id})`)
      } catch (error) {
        console.error(`❌ Failed to create ${config.id}:`, error)
      }
    }

    console.log(`\n🎉 Seed completed! Created ${results.length} form configs`)
    console.log('\nAvailable forms:')
    results.forEach((config: any) => {
      console.log(`  ${config.icon} ${config.name} (${config.id})`)
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seedForms()
