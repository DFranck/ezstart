#!/usr/bin/env node

/**
 * Image Optimization Script
 * Converts PNG/JPG images to WebP format using sharp
 *
 * Usage:
 *   node scripts/convert-images-webp.js
 *   node scripts/convert-images-webp.js --dry-run
 *   node scripts/convert-images-webp.js --app ezstart
 *
 * Features:
 * - Converts PNG/JPG to WebP (80% quality)
 * - Keeps original files (adds .webp extension)
 * - Reports file size savings
 * - Skips files < 100KB (not worth converting)
 * - Creates backup folder
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

// Configuration
const CONFIG = {
  quality: 80, // WebP quality (0-100)
  minSize: 100 * 1024, // Skip files smaller than 100KB
  extensions: ['.png', '.jpg', '.jpeg'],
  dryRun: process.argv.includes('--dry-run'),
  targetApp: process.argv.find(arg => arg.startsWith('--app='))?.split('=')[1],
}

// Stats
const stats = {
  totalFiles: 0,
  convertedFiles: 0,
  skippedFiles: 0,
  originalSize: 0,
  newSize: 0,
  errors: [],
}

/**
 * Find all images in apps/*/web/public
 */
function findImages() {
  const appsDir = path.join(__dirname, '..', 'apps')
  const images = []

  try {
    const apps = fs.readdirSync(appsDir)

    for (const app of apps) {
      // Filter by app if specified
      if (CONFIG.targetApp && app !== CONFIG.targetApp) continue

      const publicDir = path.join(appsDir, app, 'web', 'public')
      if (!fs.existsSync(publicDir)) continue

      // Recursively find images
      findImagesRecursive(publicDir, images, app)
    }
  } catch (err) {
    console.error('❌ Error finding images:', err.message)
  }

  return images
}

/**
 * Recursively search for images
 */
function findImagesRecursive(dir, images, app) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        findImagesRecursive(fullPath, images, app)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (CONFIG.extensions.includes(ext)) {
          const stats = fs.statSync(fullPath)
          images.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            app,
          })
        }
      }
    }
  } catch (err) {
    console.error(`❌ Error reading directory ${dir}:`, err.message)
  }
}

/**
 * Convert image to WebP
 */
async function convertToWebP(image) {
  const webpPath = image.path.replace(/\.(png|jpe?g)$/i, '.webp')

  // Skip if WebP already exists
  if (fs.existsSync(webpPath)) {
    console.log(`  ⏭️  ${image.name} (WebP already exists)`)
    stats.skippedFiles++
    return null
  }

  // Skip small images
  if (image.size < CONFIG.minSize) {
    console.log(`  ⏭️  ${image.name} (${formatSize(image.size)} - too small)`)
    stats.skippedFiles++
    return null
  }

  try {
    if (CONFIG.dryRun) {
      console.log(`  🔍 Would convert: ${image.name} (${formatSize(image.size)})`)
      stats.convertedFiles++
      stats.originalSize += image.size
      // Estimate 60-70% savings
      stats.newSize += Math.round(image.size * 0.35)
      return null
    }

    // Convert to WebP
    const buffer = await sharp(image.path)
      .webp({ quality: CONFIG.quality })
      .toBuffer()

    // Write WebP file
    fs.writeFileSync(webpPath, buffer)

    const savings = image.size - buffer.length
    const savingsPercent = ((savings / image.size) * 100).toFixed(1)

    console.log(
      `  ✅ ${image.name} → ${path.basename(webpPath)}\n` +
      `     ${formatSize(image.size)} → ${formatSize(buffer.length)} (${savingsPercent}% smaller)`
    )

    stats.convertedFiles++
    stats.originalSize += image.size
    stats.newSize += buffer.length

    return {
      original: image.path,
      webp: webpPath,
      savings,
    }
  } catch (err) {
    console.error(`  ❌ Error converting ${image.name}:`, err.message)
    stats.errors.push({ file: image.name, error: err.message })
    return null
  }
}

/**
 * Format file size
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Print summary
 */
function printSummary() {
  const totalSavings = stats.originalSize - stats.newSize
  const savingsPercent = stats.originalSize > 0
    ? ((totalSavings / stats.originalSize) * 100).toFixed(1)
    : 0

  console.log('\n' + '═'.repeat(60))
  console.log('📊 CONVERSION SUMMARY')
  console.log('═'.repeat(60))
  console.log(`Total images found:     ${stats.totalFiles}`)
  console.log(`Converted:              ${stats.convertedFiles}`)
  console.log(`Skipped:                ${stats.skippedFiles}`)
  console.log(`Errors:                 ${stats.errors.length}`)
  console.log('─'.repeat(60))
  console.log(`Original size:          ${formatSize(stats.originalSize)}`)
  console.log(`New size:               ${formatSize(stats.newSize)}`)
  console.log(`Savings:                ${formatSize(totalSavings)} (${savingsPercent}%)`)
  console.log('═'.repeat(60))

  if (CONFIG.dryRun) {
    console.log('\n💡 This was a DRY RUN. No files were actually converted.')
    console.log('   Run without --dry-run to perform actual conversion.')
  }

  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS:')
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`)
    })
  }
}

/**
 * Main function
 */
async function main() {
  console.log('⚡ Image Optimization Script')
  console.log('─'.repeat(60))
  console.log(`Mode:                   ${CONFIG.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Quality:                ${CONFIG.quality}%`)
  console.log(`Min file size:          ${formatSize(CONFIG.minSize)}`)
  if (CONFIG.targetApp) {
    console.log(`Target app:             ${CONFIG.targetApp}`)
  }
  console.log('─'.repeat(60))
  console.log('')

  // Find all images
  console.log('🔍 Finding images...')
  const images = findImages()
  stats.totalFiles = images.length

  if (images.length === 0) {
    console.log('❌ No images found!')
    return
  }

  // Sort by size (largest first)
  images.sort((a, b) => b.size - a.size)

  console.log(`\n📸 Found ${images.length} images\n`)

  // Group by app
  const byApp = {}
  images.forEach(img => {
    if (!byApp[img.app]) byApp[img.app] = []
    byApp[img.app].push(img)
  })

  // Convert images by app
  for (const [app, appImages] of Object.entries(byApp)) {
    console.log(`\n🎯 App: ${app} (${appImages.length} images)`)
    console.log('─'.repeat(60))

    for (const image of appImages) {
      await convertToWebP(image)
    }
  }

  // Print summary
  printSummary()

  // Exit with error if there were errors
  if (stats.errors.length > 0) {
    process.exit(1)
  }
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
