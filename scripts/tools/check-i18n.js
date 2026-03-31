#!/usr/bin/env node
/**
 * Check for hardcoded user-facing strings in .tsx files.
 * Run: node scripts/tools/check-i18n.js
 */
const fs = require('fs')
const path = require('path')

// Patterns that suggest hardcoded strings in JSX
const patterns = [
  { regex: /toast\.(success|error|info|warning)\(["']/g, label: 'toast with hardcoded string' },
  { regex: /placeholder=["'][A-Z]/g, label: 'placeholder with hardcoded string' },
  { regex: />\s*[A-Z][a-z]+\s+[a-z]+/g, label: 'JSX text content' },
]

function findTsxFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    if (entry.isDirectory()) {
      results.push(...findTsxFiles(full))
    } else if (entry.name.endsWith('.tsx')) {
      results.push(full)
    }
  }
  return results
}

// Scan all apps/*/web/src directories
const appsDir = path.join(process.cwd(), 'apps')
const appNames = fs.existsSync(appsDir)
  ? fs
      .readdirSync(appsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  : []

let total = 0
const violations = []

for (const app of appNames) {
  const srcDir = path.join(appsDir, app, 'web', 'src')
  const files = findTsxFiles(srcDir)
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (content.includes('useTranslations')) continue
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('// i18n-ok')) continue
      for (const { regex, label } of patterns) {
        regex.lastIndex = 0
        if (regex.test(line)) {
          const relPath = path.relative(process.cwd(), file)
          violations.push({ file: relPath, line: i + 1, text: line.trim(), label })
          total++
        }
      }
    }
  }
}

if (total === 0) {
  console.log('✅ No obvious i18n violations found')
} else {
  console.log(`⚠ ${total} potential i18n violations:\n`)
  for (const v of violations.slice(0, 20)) {
    console.log(`  ${v.file}:${v.line}  [${v.label}]`)
    console.log(`    ${v.text}`)
  }
  if (total > 20) console.log(`\n  ... and ${total - 20} more`)
  console.log(`\nAdd "// i18n-ok" comment to mark intentional hardcoded strings`)
}
