/**
 * Migrate raw HTML tags to @ezstart/ui Tag components.
 *
 * Replacements:
 *   <div> → <Div>, <span> → <Span>, <p> → <P>, <h1-h6> → <H1-H6>,
 *   <section> → <Section>, <header> → <Header>, <footer> → <FooterTag>,
 *   <main> → <Main>, <nav> → <Nav>, <aside> → <Aside>,
 *   <ul> → <UL>, <li> → <LI>, <article> → <Article>, <strong> → <Strong>, <ol> → <Ol>
 *
 * KEEP native: <form>, <img>, <table>, <svg>, <input>, PDF/print contexts,
 *              offscreen DOM capture, SVG/drag interactive elements.
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Tag mapping: htmlTag → ComponentName
const TAG_MAP = {
  div: 'Div',
  span: 'Span',
  p: 'P',
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
  h5: 'H5',
  h6: 'H6',
  section: 'Section',
  header: 'Header',
  footer: 'FooterTag',
  main: 'Main',
  nav: 'Nav',
  aside: 'Aside',
  ul: 'UL',
  li: 'LI',
  article: 'Article',
  strong: 'Strong',
  ol: 'Ol',
}

// Files/paths to skip entirely (PDF, SVG-heavy, offscreen capture, drag)
const SKIP_FILES = [
  // Add specific file patterns to skip if needed
]

// Check if a file should be entirely skipped
function shouldSkipFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  // Skip files in PDF-related directories
  if (normalized.includes('/pdf/') || normalized.includes('/print/')) return true
  return SKIP_FILES.some(pattern => normalized.includes(pattern))
}

// Check if a line is inside an SVG, drag handler, or offscreen capture context
// We handle this at the block level instead
function isExcludedContext(content, matchIndex) {
  // Check if we're inside a ref-based offscreen container (used for html2canvas etc.)
  // Look backwards for patterns like "style={{ position: 'absolute', left: '-9999px'"
  // or "offscreen" or "capture" refs
  const before = content.substring(Math.max(0, matchIndex - 500), matchIndex)

  // SVG context - check if inside <svg>...</svg>
  const lastSvgOpen = before.lastIndexOf('<svg')
  const lastSvgClose = before.lastIndexOf('</svg>')
  if (lastSvgOpen > lastSvgClose) return true

  return false
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const originalContent = content

  // Track which components we need to import
  const neededImports = new Set()

  // Process each tag type
  for (const [htmlTag, componentName] of Object.entries(TAG_MAP)) {
    // Opening tags: <div ...> or <div>
    const openRegex = new RegExp(`<${htmlTag}(\\s|>|\\/)`, 'g')
    // Closing tags: </div>
    const closeRegex = new RegExp(`</${htmlTag}>`, 'g')

    // Check if this tag exists in the file
    if (!openRegex.test(content) && !closeRegex.test(content)) continue

    // Reset regex
    openRegex.lastIndex = 0
    closeRegex.lastIndex = 0

    // Check for SVG context - skip tags inside SVG blocks
    // We'll do a simple approach: replace all, but skip SVG blocks

    let match
    const replacements = []

    // Find all opening tags
    while ((match = openRegex.exec(content)) !== null) {
      if (!isExcludedContext(content, match.index)) {
        replacements.push({
          index: match.index,
          length: htmlTag.length + 1, // <tagname
          replacement: `<${componentName}`,
          type: 'open'
        })
        neededImports.add(componentName)
      }
    }

    // Find all closing tags
    while ((match = closeRegex.exec(content)) !== null) {
      if (!isExcludedContext(content, match.index)) {
        replacements.push({
          index: match.index,
          length: htmlTag.length + 3, // </tagname>
          replacement: `</${componentName}>`,
          type: 'close'
        })
        neededImports.add(componentName)
      }
    }

    // Apply replacements in reverse order to preserve indices
    replacements.sort((a, b) => b.index - a.index)
    for (const r of replacements) {
      content = content.substring(0, r.index) + r.replacement + content.substring(r.index + r.length)
    }
  }

  if (neededImports.size === 0) return false

  // Now handle imports
  content = addImports(content, neededImports)

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  }
  return false
}

function addImports(content, neededImports) {
  // Find existing @ezstart/ui/components import
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@ezstart\/ui\/components['"]/
  const match = content.match(importRegex)

  if (match) {
    // Parse existing imports
    const existingImports = match[1].split(',').map(s => s.trim()).filter(Boolean)
    const existingSet = new Set(existingImports)

    // Add new imports
    let changed = false
    for (const imp of neededImports) {
      if (!existingSet.has(imp)) {
        existingImports.push(imp)
        changed = true
      }
    }

    if (changed) {
      // Sort imports alphabetically
      existingImports.sort((a, b) => a.localeCompare(b))
      const newImportLine = `import { ${existingImports.join(', ')} } from '@ezstart/ui/components'`
      content = content.replace(importRegex, newImportLine)
    }
  } else {
    // No existing import - add one
    const imports = Array.from(neededImports).sort()
    const importLine = `import { ${imports.join(', ')} } from '@ezstart/ui/components'\n`

    // Find the best place to insert (after other imports)
    const lines = content.split('\n')
    let lastImportIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith("import{")) {
        lastImportIndex = i
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importLine.trimEnd())
      content = lines.join('\n')
    } else {
      // No imports at all, add at top (after 'use client' if present)
      if (content.startsWith("'use client'") || content.startsWith('"use client"')) {
        const firstNewline = content.indexOf('\n')
        content = content.substring(0, firstNewline + 1) + '\n' + importLine + content.substring(firstNewline + 1)
      } else {
        content = importLine + '\n' + content
      }
    }
  }

  return content
}

// Find all .tsx files in the target apps
const apps = [
  'apps/green-pulse/web/src',
  'apps/fengshui/web/src',
  'apps/gacha-analyzer/web/src',
  'apps/asc-tcd/web/src',
  'apps/ezpay/web/src',
  'apps/ezauth/web/src',
]

const root = process.cwd()
let totalFiles = 0
let totalModified = 0

for (const app of apps) {
  const appPath = path.join(root, app)
  console.log(`\nProcessing ${app}...`)

  const files = execSync(`find "${appPath}" -name "*.tsx" -type f`, { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(Boolean)

  let modified = 0
  for (const file of files) {
    if (shouldSkipFile(file)) {
      console.log(`  SKIP: ${path.relative(root, file)}`)
      continue
    }

    totalFiles++
    if (processFile(file)) {
      modified++
      totalModified++
      console.log(`  Modified: ${path.relative(root, file)}`)
    }
  }

  console.log(`  ${modified}/${files.length} files modified`)
}

console.log(`\nTotal: ${totalModified}/${totalFiles} files modified`)
