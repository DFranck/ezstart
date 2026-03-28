#!/usr/bin/env node

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(__dirname, '../../..')

/**
 * Find all web apps in the monorepo
 */
async function findWebApps() {
  const appsDir = path.join(monorepoRoot, 'apps')
  const apps = []

  try {
    const appNames = await fs.readdir(appsDir)

    for (const appName of appNames) {
      const webDir = path.join(appsDir, appName, 'web')
      const publicDir = path.join(webDir, 'public')

      try {
        await fs.access(publicDir)
        apps.push({
          name: appName,
          webDir,
          publicDir,
        })
      } catch {
        // No web directory, skip
      }
    }
  } catch (error) {
    console.error('❌ Error reading apps directory:', error.message)
    process.exit(1)
  }

  return apps
}

/**
 * Check if app has a logo source file
 */
async function hasLogoSource(publicDir) {
  const possibleSources = ['logo.svg', 'logo.png', 'logo.jpg', 'logo.jpeg']

  for (const source of possibleSources) {
    try {
      await fs.access(path.join(publicDir, source))
      return source
    } catch {
      continue
    }
  }

  return null
}

/**
 * Generate icons for a single app
 */
async function generateIconsForApp(app) {
  const scriptPath = path.join(__dirname, 'generate-icons.js')

  try {
    console.log(`\n📦 Generating icons for ${app.name}...`)

    // Change to web directory and run generate-icons.js
    execSync(`node "${scriptPath}"`, {
      cwd: app.webDir,
      stdio: 'inherit',
    })

    return { app: app.name, success: true }
  } catch (error) {
    console.error(`❌ Failed to generate icons for ${app.name}:`, error.message)
    return { app: app.name, success: false, error: error.message }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 PWA Icon Generator - Batch Mode')
  console.log('📂 Monorepo root:', monorepoRoot)
  console.log('=' .repeat(60))

  // Find all web apps
  const apps = await findWebApps()
  console.log(`\n✅ Found ${apps.length} web apps:`)

  // Check which apps have logo sources
  const appsWithLogos = []
  const appsWithoutLogos = []

  for (const app of apps) {
    const logoSource = await hasLogoSource(app.publicDir)
    if (logoSource) {
      appsWithLogos.push({ ...app, logoSource })
      console.log(`   ✅ ${app.name.padEnd(20)} → ${logoSource}`)
    } else {
      appsWithoutLogos.push(app)
      console.log(`   ⚠️  ${app.name.padEnd(20)} → No logo source found`)
    }
  }

  if (appsWithoutLogos.length > 0) {
    console.log('\n⚠️  Apps without logo sources will be skipped:')
    appsWithoutLogos.forEach(app => console.log(`   - ${app.name}`))
  }

  if (appsWithLogos.length === 0) {
    console.log('\n❌ No apps with logo sources found. Nothing to generate.')
    process.exit(0)
  }

  console.log(`\n📦 Generating icons for ${appsWithLogos.length} apps...`)
  console.log('=' .repeat(60))

  // Generate icons for all apps with logos
  const results = []
  for (const app of appsWithLogos) {
    const result = await generateIconsForApp(app)
    results.push(result)
  }

  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 Summary:')
  console.log('=' .repeat(60))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\n✅ Successful: ${successful.length}`)
  successful.forEach(r => console.log(`   - ${r.app}`))

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`)
    failed.forEach(r => console.log(`   - ${r.app}: ${r.error}`))
  }

  console.log(`\n🎉 Icons generation complete!`)
  console.log(`   Total apps: ${apps.length}`)
  console.log(`   Generated: ${successful.length}`)
  console.log(`   Skipped: ${appsWithoutLogos.length}`)
  console.log(`   Failed: ${failed.length}`)

  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
