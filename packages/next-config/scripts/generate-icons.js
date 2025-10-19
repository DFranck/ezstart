#!/usr/bin/env node

import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * PWA Icon sizes required for full compatibility
 */
const PWA_SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512]
const FAVICON_SIZES = [16, 32, 48]
const APPLE_TOUCH_ICON_SIZE = 180

/**
 * Find logo source file in public directory
 */
async function findLogoSource(publicDir) {
  const possibleSources = [
    'logo.png',
    'logo.svg',
    'logo.jpg',
    'logo.jpeg',
    'logo-source.png',
    'logo-source.svg',
    'icon.png',
    'icon.svg',
  ]

  for (const source of possibleSources) {
    const sourcePath = path.join(publicDir, source)
    try {
      await fs.access(sourcePath)
      return sourcePath
    } catch {
      continue
    }
  }

  return null
}

/**
 * Generate PWA icons from logo source
 */
async function generatePWAIcons(logoPath, outputDir) {
  console.log(`📦 Generating PWA icons from: ${path.basename(logoPath)}`)

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true })

  // Generate all PWA icon sizes
  for (const size of PWA_SIZES) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`)

    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath)

    console.log(`  ✅ Generated icon-${size}x${size}.png`)
  }

  console.log(`🎉 Generated ${PWA_SIZES.length} PWA icons`)
}

/**
 * Generate favicon.ico (multi-size)
 */
async function generateFavicon(logoPath, publicDir) {
  console.log(`📦 Generating favicon.ico`)

  const faviconPath = path.join(publicDir, 'favicon.ico')

  // Generate 16x16 as base (browsers will scale)
  await sharp(logoPath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(faviconPath.replace('.ico', '.png'))

  // Note: True multi-size .ico generation requires additional library
  // For now, we generate a high-quality 32x32 PNG that Next.js will serve
  console.log(`  ✅ Generated favicon.png (32x32)`)
}

/**
 * Generate Apple Touch Icon
 */
async function generateAppleTouchIcon(logoPath, publicDir) {
  console.log(`📦 Generating apple-touch-icon.png`)

  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png')

  await sharp(logoPath)
    .resize(APPLE_TOUCH_ICON_SIZE, APPLE_TOUCH_ICON_SIZE, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }, // Opaque white background for iOS
    })
    .png({ quality: 100 })
    .toFile(appleTouchPath)

  console.log(`  ✅ Generated apple-touch-icon.png (180x180)`)
}

/**
 * Main function
 */
async function main() {
  try {
    // Get current working directory (should be app root)
    const cwd = process.cwd()
    const publicDir = path.join(cwd, 'public')
    const iconsDir = path.join(publicDir, 'icons')

    console.log(`🚀 PWA Icon Generator for @ezstart/next-config`)
    console.log(`📂 Working directory: ${cwd}`)
    console.log(`📂 Public directory: ${publicDir}`)

    // Find logo source
    const logoPath = await findLogoSource(publicDir)

    if (!logoPath) {
      console.error(`❌ No logo source found in ${publicDir}`)
      console.error(`   Expected files: logo.png, logo.svg, logo-source.png, etc.`)
      console.error(`   Please add a logo file to your public directory`)
      process.exit(1)
    }

    console.log(`✅ Found logo source: ${path.basename(logoPath)}`)
    console.log('')

    // Generate all icons
    await generatePWAIcons(logoPath, iconsDir)
    console.log('')

    await generateFavicon(logoPath, publicDir)
    console.log('')

    await generateAppleTouchIcon(logoPath, publicDir)
    console.log('')

    console.log(`🎉 All PWA icons generated successfully!`)
    console.log(`📍 Icons location: ${iconsDir}`)
    console.log(`📍 Favicon location: ${publicDir}/favicon.png`)
    console.log(`📍 Apple Touch Icon: ${publicDir}/apple-touch-icon.png`)
  } catch (error) {
    console.error('❌ Error generating icons:', error.message)
    process.exit(1)
  }
}

main()
