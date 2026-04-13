#!/usr/bin/env tsx
/**
 * Auto-generate TypeScript exports from CSS theme files.
 *
 * Source of truth: CSS files (globals.css, themes/<name>/<name>.css)
 * Outputs: <source>.generated.ts files (gitignored)
 *
 * Naming convention: `<basename>.generated.ts` makes outputs easy to
 * gitignore and identify as derived artifacts.
 *
 * Usage: pnpm --filter @ezstart/ui generate (via orchestrator)
 *        tsx packages/ui/scripts/generate-theme-exports.ts (direct)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const STYLES_DIR = join(__dirname, '..', 'src', 'styles')
const THEMES_DIR = join(STYLES_DIR, 'themes')

/**
 * Extract content between CSS selector braces
 */
function extractBlockContent(cssContent: string, selector: string): string | null {
  const selectorRegex = new RegExp(`${selector}\\s*\\{`, 'i')
  const match = selectorRegex.exec(cssContent)
  if (!match) return null

  const startIndex = match.index + match[0].length
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

/**
 * Generate TypeScript export for globals.css → globals.generated.ts
 */
function generateGlobalsExport(): void {
  const cssPath = join(STYLES_DIR, 'globals.css')
  if (!existsSync(cssPath)) {
    console.warn('⚠️  globals.css not found, skipping')
    return
  }

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
 * Regenerated via \`turbo run generate\` (or \`pnpm generate\`)
 */
export const globalThemeCss = \`${extractedCss}\`
`

  const outputPath = join(STYLES_DIR, 'globals.generated.ts')
  writeFileSync(outputPath, tsContent, 'utf-8')
  console.log('✅ Generated styles/globals.generated.ts')
}

/**
 * Generate TypeScript exports for all theme CSS files → <theme>.generated.ts
 */
function generateThemeExports(): void {
  if (!existsSync(THEMES_DIR)) {
    console.warn('⚠️  themes directory not found, skipping')
    return
  }

  const themeFolders = readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const themeName of themeFolders) {
    const cssFile = `${themeName}.css`
    const cssPath = join(THEMES_DIR, themeName, cssFile)

    if (!existsSync(cssPath)) {
      console.warn(`⚠️  Skipping ${themeName} - no CSS file found`)
      continue
    }

    const cssContent = readFileSync(cssPath, 'utf-8')
    const exportName =
      themeName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) + 'ThemeCss'

    const titleCase = themeName.charAt(0).toUpperCase() + themeName.slice(1)
    const tsContent = `/**
 * ${titleCase} Theme CSS
 * Source: packages/ui/src/styles/themes/${themeName}/${cssFile}
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Regenerated via \`turbo run generate\` (or \`pnpm generate\`)
 */
export const ${exportName} = \`${cssContent}\`
`

    const outputPath = join(THEMES_DIR, themeName, `${themeName}.generated.ts`)
    writeFileSync(outputPath, tsContent, 'utf-8')
    console.log(`✅ Generated themes/${themeName}/${themeName}.generated.ts`)
  }
}

console.log('🎨 Generating theme exports from CSS files...\n')
generateGlobalsExport()
generateThemeExports()
console.log('\n✨ Theme exports generated.')
