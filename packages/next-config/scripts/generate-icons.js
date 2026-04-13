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
    'logo.svg', // ⭐ Priorité 1: SVG vectoriel (meilleure qualité)
    'logo.png', // Priorité 2: PNG haute résolution
    'logo-source.svg', // Priorité 3: SVG source alternative
    'logo-source.png', // Priorité 4: PNG source alternative
    'icon.svg', // Priorité 5: SVG icon fallback
    'icon.png', // Priorité 6: PNG icon fallback
    'logo.jpg', // Priorité 7: JPG (pas de transparence)
    'logo.jpeg', // Priorité 8: JPEG (pas de transparence)
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
 * Generate fallback logo with app name
 */
function generateFallbackLogo(appName) {
  // Extract app name from cwd (e.g., /apps/ezstart/web -> ezstart)
  const name = appName || 'App'
  const initials = name
    .split('-')
    .map(word => word[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2)

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#grad)"/>
  <text x="256" y="320" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="180" font-weight="bold">${initials}</text>
</svg>
`
  return Buffer.from(svg, 'utf-8')
}

/**
 * Generate PWA icons from logo source (path or buffer)
 */
async function generatePWAIcons(logoSource, outputDir) {
  const sourceName = Buffer.isBuffer(logoSource) ? 'fallback SVG' : path.basename(logoSource)
  console.log(`📦 Generating PWA icons from: ${sourceName}`)

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true })

  // Generate all PWA icon sizes
  for (const size of PWA_SIZES) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`)

    await sharp(logoSource)
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
async function generateFavicon(logoSource, publicDir) {
  console.log(`📦 Generating favicon.ico`)

  const faviconPath = path.join(publicDir, 'favicon.ico')

  // Generate 16x16 as base (browsers will scale)
  await sharp(logoSource)
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
async function generateAppleTouchIcon(logoSource, publicDir) {
  console.log(`📦 Generating apple-touch-icon.png`)

  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png')

  await sharp(logoSource)
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

    // Find logo source or use fallback
    let logoPath = await findLogoSource(publicDir)
    let logoBuffer

    if (!logoPath) {
      console.warn(`⚠️ No logo source found in ${publicDir}`)
      console.log(`📦 Generating fallback logo with app initials...`)

      // Extract app name from cwd (e.g., /apps/ezstart/web -> ezstart)
      const appName = cwd.split(path.sep).reverse()[1] || 'app'
      logoBuffer = generateFallbackLogo(appName)

      console.log(`✅ Generated fallback logo for: ${appName}`)
      console.log(`💡 Tip: Add logo.png or logo.svg to ${publicDir} for custom branding`)
    } else {
      console.log(`✅ Found logo source: ${path.basename(logoPath)}`)
    }

    console.log('')

    // Generate all icons
    await generatePWAIcons(logoPath || logoBuffer, iconsDir)
    console.log('')

    await generateFavicon(logoPath || logoBuffer, publicDir)
    console.log('')

    await generateAppleTouchIcon(logoPath || logoBuffer, publicDir)
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
