#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

// Top 10 images à convertir (résultats du scan)
const TARGET_IMAGES = [
  'apps/ezstart/web/public/images/projects/lima-prod-mobile.png',
  'apps/ezstart/web/public/images/projects/transplantation-arbres-mobile.png',
  'apps/ezstart/web/public/images/projects/zephyrus-desktop.png',
  'apps/asc-tcd/web/public/images/fond-noisy.jpg',
  'apps/ezstart/web/public/images/projects/transplantation-arbres-desktop.png',
  'apps/asc-tcd/web/public/images/bergerac-2023-web.png',
  'apps/tower-defense/web/public/assets/sprites/seamless/grass.png',
  'apps/ezstart/web/public/images/projects/evento-app.io-desktop.png',
  'apps/ezstart/web/public/images/libraries/ez-tag.png',
  'apps/green-pulse/web/public/logo.png',
]

const stats = {
  converted: 0,
  skipped: 0,
  errors: 0,
  originalSize: 0,
  newSize: 0,
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function convertImage(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath)
  const webpPath = fullPath.replace(/\.(png|jpe?g)$/i, '.webp')

  // Check if source exists
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ ${relativePath} - File not found`)
    stats.errors++
    return
  }

  // Skip if WebP already exists
  if (fs.existsSync(webpPath)) {
    console.log(`  ⏭️  ${path.basename(fullPath)} - WebP already exists`)
    stats.skipped++
    return
  }

  try {
    const originalStats = fs.statSync(fullPath)
    stats.originalSize += originalStats.size

    // Convert to WebP
    const buffer = await sharp(fullPath)
      .webp({ quality: 80 })
      .toBuffer()

    // Write WebP file
    fs.writeFileSync(webpPath, buffer)

    stats.newSize += buffer.length
    stats.converted++

    const savings = originalStats.size - buffer.length
    const savingsPercent = ((savings / originalStats.size) * 100).toFixed(1)

    console.log(
      `  ✅ ${path.basename(fullPath)} → ${path.basename(webpPath)}\n` +
      `     ${formatSize(originalStats.size)} → ${formatSize(buffer.length)} (-${savingsPercent}%)`
    )
  } catch (err) {
    console.error(`  ❌ ${path.basename(fullPath)} - ${err.message}`)
    stats.errors++
  }
}

async function main() {
  console.log('⚡ Image Optimization Script - Top 10 Images')
  console.log('─'.repeat(60))
  console.log(`Target: ${TARGET_IMAGES.length} images`)
  console.log(`Quality: 80% WebP`)
  console.log('─'.repeat(60))
  console.log('')

  // Convert each image
  for (const imgPath of TARGET_IMAGES) {
    await convertImage(imgPath)
  }

  // Summary
  const totalSavings = stats.originalSize - stats.newSize
  const savingsPercent = stats.originalSize > 0
    ? ((totalSavings / stats.originalSize) * 100).toFixed(1)
    : 0

  console.log('\n' + '═'.repeat(60))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(60))
  console.log(`Converted:    ${stats.converted}`)
  console.log(`Skipped:      ${stats.skipped}`)
  console.log(`Errors:       ${stats.errors}`)
  console.log('─'.repeat(60))
  console.log(`Original:     ${formatSize(stats.originalSize)}`)
  console.log(`New size:     ${formatSize(stats.newSize)}`)
  console.log(`Savings:      ${formatSize(totalSavings)} (-${savingsPercent}%)`)
  console.log('═'.repeat(60))

  if (stats.errors > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
