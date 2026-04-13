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
const MASKABLE_SIZES = [192, 512] // sizes generated as both transparent + maskable variant
const APPLE_TOUCH_ICON_SIZE = 180

const DEFAULT_BRAND_COLOR = '#000000'
const DEFAULT_LOGO_SAFE_ZONE = 0.8

/**
 * Find logo source file in public directory
 */
async function findLogoSource(publicDir) {
  const possibleSources = [
    'logo.svg',
    'logo.png',
    'logo-source.svg',
    'logo-source.png',
    'icon.svg',
    'icon.png',
    'logo.jpg',
    'logo.jpeg',
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
 * Load brand config from public/manifest.config.json
 * Falls back to reading manifest.json theme_color, then DEFAULT_BRAND_COLOR.
 */
async function loadBrandConfig(publicDir) {
  const configPath = path.join(publicDir, 'manifest.config.json')
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    const cfg = JSON.parse(raw)
    return {
      brandColor: cfg.brandColor || DEFAULT_BRAND_COLOR,
      logoSafeZone:
        typeof cfg.logoSafeZone === 'number' ? cfg.logoSafeZone : DEFAULT_LOGO_SAFE_ZONE,
    }
  } catch {
    // Fallback: try manifest.json theme_color
    try {
      const manifestRaw = await fs.readFile(path.join(publicDir, 'manifest.json'), 'utf-8')
      const manifest = JSON.parse(manifestRaw)
      if (manifest.theme_color) {
        return { brandColor: manifest.theme_color, logoSafeZone: DEFAULT_LOGO_SAFE_ZONE }
      }
    } catch {
      // ignore
    }
    return { brandColor: DEFAULT_BRAND_COLOR, logoSafeZone: DEFAULT_LOGO_SAFE_ZONE }
  }
}

/**
 * Convert hex color (#rrggbb or #rgb) to {r,g,b}
 */
function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim()
  let normalized = clean
  if (clean.length === 3) {
    normalized = clean
      .split('')
      .map(c => c + c)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    console.warn(`⚠️ Invalid hex color "${hex}", falling back to #000000`)
    return { r: 0, g: 0, b: 0 }
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

/**
 * Generate fallback logo with app name
 */
function generateFallbackLogo(appName) {
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
 * Generate transparent PWA icon at given size
 */
async function generateTransparentIcon(logoSource, outputPath, size) {
  await sharp(logoSource)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath)
}

/**
 * Generate maskable PWA icon at given size:
 * - opaque canvas filled with brandColor
 * - logo resized to size * safeZone, centered
 */
async function generateMaskableIcon(logoSource, outputPath, size, brandColor, safeZone) {
  const { r, g, b } = hexToRgb(brandColor)
  const innerSize = Math.round(size * safeZone)

  // Resize logo to inner size with transparent bg
  const logoBuffer = await sharp(logoSource)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  // Create opaque background canvas and composite logo centered
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r, g, b, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath)
}

/**
 * Generate all PWA icons (transparent + maskable variants)
 */
async function generatePWAIcons(logoSource, outputDir, brandConfig) {
  const sourceName = Buffer.isBuffer(logoSource) ? 'fallback SVG' : path.basename(logoSource)
  console.log(`📦 Generating PWA icons from: ${sourceName}`)
  console.log(`   brandColor=${brandConfig.brandColor} safeZone=${brandConfig.logoSafeZone}`)

  await fs.mkdir(outputDir, { recursive: true })

  // Transparent variants (all sizes — backward compat)
  for (const size of PWA_SIZES) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`)
    await generateTransparentIcon(logoSource, outputPath, size)
    console.log(`  ✅ icon-${size}x${size}.png (transparent)`)
  }

  // Maskable variants for Android adaptive icons (opaque + safe zone)
  for (const size of MASKABLE_SIZES) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}-maskable.png`)
    await generateMaskableIcon(
      logoSource,
      outputPath,
      size,
      brandConfig.brandColor,
      brandConfig.logoSafeZone
    )
    console.log(`  ✅ icon-${size}x${size}-maskable.png (opaque ${brandConfig.brandColor})`)
  }

  console.log(
    `🎉 Generated ${PWA_SIZES.length} transparent + ${MASKABLE_SIZES.length} maskable icons`
  )
}

/**
 * Generate favicon.png
 */
async function generateFavicon(logoSource, publicDir) {
  console.log(`📦 Generating favicon.png`)
  const faviconPath = path.join(publicDir, 'favicon.png')

  await sharp(logoSource)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(faviconPath)

  console.log(`  ✅ favicon.png (32x32)`)
}

/**
 * Generate Apple Touch Icon (opaque with brand color background)
 */
async function generateAppleTouchIcon(logoSource, publicDir, brandConfig) {
  console.log(`📦 Generating apple-touch-icon.png`)
  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png')

  await generateMaskableIcon(
    logoSource,
    appleTouchPath,
    APPLE_TOUCH_ICON_SIZE,
    brandConfig.brandColor,
    brandConfig.logoSafeZone
  )

  console.log(
    `  ✅ apple-touch-icon.png (${APPLE_TOUCH_ICON_SIZE}x${APPLE_TOUCH_ICON_SIZE} opaque ${brandConfig.brandColor})`
  )
}

/**
 * Main function
 */
async function main() {
  try {
    const cwd = process.cwd()
    const publicDir = path.join(cwd, 'public')
    const iconsDir = path.join(publicDir, 'icons')

    console.log(`🚀 PWA Icon Generator for @ezstart/next-config`)
    console.log(`📂 Working directory: ${cwd}`)
    console.log(`📂 Public directory: ${publicDir}`)

    // Load brand config (manifest.config.json or fallback)
    const brandConfig = await loadBrandConfig(publicDir)

    // Find logo source or use fallback
    let logoPath = await findLogoSource(publicDir)
    let logoBuffer

    if (!logoPath) {
      console.warn(`⚠️ No logo source found in ${publicDir}`)
      console.log(`📦 Generating fallback logo with app initials...`)
      const appName = cwd.split(path.sep).reverse()[1] || 'app'
      logoBuffer = generateFallbackLogo(appName)
      console.log(`✅ Generated fallback logo for: ${appName}`)
    } else {
      console.log(`✅ Found logo source: ${path.basename(logoPath)}`)
    }

    console.log('')

    await generatePWAIcons(logoPath || logoBuffer, iconsDir, brandConfig)
    console.log('')

    await generateFavicon(logoPath || logoBuffer, publicDir)
    console.log('')

    await generateAppleTouchIcon(logoPath || logoBuffer, publicDir, brandConfig)
    console.log('')

    console.log(`🎉 All PWA icons generated successfully!`)
    console.log(`📍 Icons location: ${iconsDir}`)
  } catch (error) {
    console.error('❌ Error generating icons:', error.message)
    process.exit(1)
  }
}

main()
