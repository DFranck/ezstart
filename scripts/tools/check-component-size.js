#!/usr/bin/env node
/**
 * Check for oversized components (>300 lines).
 * Run: node scripts/tools/check-component-size.js
 */
const fs = require('fs')
const path = require('path')

const MAX_LINES = 300

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

const appsDir = path.join(process.cwd(), 'apps')
const files = findTsxFiles(appsDir)

const oversized = []
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length
  if (lines > MAX_LINES) {
    oversized.push({ file: path.relative(process.cwd(), file), lines })
  }
}

oversized.sort((a, b) => b.lines - a.lines)

if (oversized.length === 0) {
  console.log('✅ All components under 300 lines')
} else {
  console.log(`⚠ ${oversized.length} oversized components (>${MAX_LINES} lines):\n`)
  for (const { file, lines } of oversized) {
    console.log(`  ${lines.toString().padStart(5)} lines  ${file}`)
  }
}
