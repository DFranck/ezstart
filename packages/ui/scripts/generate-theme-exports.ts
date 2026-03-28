#!/usr/bin/env tsx
/**
 * Auto-generate TypeScript exports from CSS theme files
 * Prevents duplication between .css and .ts files
 *
 * Usage: pnpm generate:themes
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const STYLES_DIR = join(__dirname, '..', 'src', 'styles')
const THEMES_DIR = join(STYLES_DIR, 'themes')

/**
 * Generate TypeScript export for globals.css
 */
function generateGlobalsExport() {
  const cssPath = join(STYLES_DIR, 'globals.css')
  const cssContent = readFileSync(cssPath, 'utf-8')

  // Extract only :root and .dark blocks
  const rootContent = extractBlockContent(cssContent, ':root')
  const darkContent = extractBlockContent(cssContent, '\\.dark')

  let extractedCss = ''
  if (rootContent) {
    extractedCss += `:root {\n${rootContent}\n}\n`
  }
  if (darkContent) {
    extractedCss += `\n.dark {\n${darkContent}\n}`
  }

  const tsContent = `/**
 * Global Theme CSS
 * Source: packages/ui/src/styles/globals.css
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run \`pnpm generate:themes\` to regenerate from CSS source
 */
export const globalThemeCss = \`${extractedCss}\`
`

  // Generate in styles/ directory (same level as globals.css)
  const outputPath = join(STYLES_DIR, 'globals.ts')
  writeFileSync(outputPath, tsContent, 'utf-8')
  console.log('✅ Generated styles/globals.ts')
}

/**
 * Generate TypeScript exports for all theme CSS files
 */
function generateThemeExports() {
  // Read theme folders (each folder contains CSS + TS)
  const themeFolders = readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const themeName of themeFolders) {
    const cssFile = `${themeName}.css`
    const cssPath = join(THEMES_DIR, themeName, cssFile)

    // Skip if CSS file doesn't exist
    if (!existsSync(cssPath)) {
      console.warn(`⚠️  Skipping ${themeName} - no CSS file found`)
      continue
    }

    const cssContent = readFileSync(cssPath, 'utf-8')
    const exportName = themeName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) + 'ThemeCss'

    const tsContent = `/**
 * ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme CSS
 * Source: packages/ui/src/styles/themes/${themeName}/${cssFile}
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run \`pnpm generate:themes\` to regenerate from CSS source
 */
export const ${exportName} = \`${cssContent}\`
`

    const outputPath = join(THEMES_DIR, themeName, `${themeName}.ts`)
    writeFileSync(outputPath, tsContent, 'utf-8')
    console.log(`✅ Generated themes/${themeName}/${themeName}.ts`)
  }
}

/**
 * Extract content between CSS selector braces
 */
function extractBlockContent(cssContent: string, selector: string): string | null {
  const selectorRegex = new RegExp(`${selector}\\s*\\{`, 'i')
  const match = selectorRegex.exec(cssContent)
  if (!match) return null

  let startIndex = match.index + match[0].length
  let braceCount = 1
  let endIndex = startIndex

  for (let i = startIndex; i < cssContent.length; i++) {
    if (cssContent[i] === '{') braceCount++
    if (cssContent[i] === '}') braceCount--

    if (braceCount === 0) {
      endIndex = i
      break
    }
  }

  if (braceCount !== 0) return null
  return cssContent.substring(startIndex, endIndex)
}

// Run generation
console.log('🎨 Generating theme exports from CSS files...\n')
generateGlobalsExport()
generateThemeExports()
console.log('\n✨ Done! All theme exports generated.')
