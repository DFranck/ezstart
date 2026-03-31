#!/usr/bin/env node
/**
 * Basic dead code detector — finds .ts/.tsx files never imported by other files.
 * Run: node scripts/tools/check-dead-code.js
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Find all .ts/.tsx files in apps/
const files = execSync(
  'find apps -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | grep -v dist | grep -v __tests__',
  { encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean)

const orphans = []
for (const file of files) {
  const basename = path.basename(file, path.extname(file))
  // Skip index files, layout, page (Next.js conventions)
  if (
    ['index', 'layout', 'page', 'loading', 'error', 'not-found', 'middleware', 'route'].includes(
      basename
    )
  )
    continue
  // Skip test files
  if (basename.includes('.test') || basename.includes('.spec')) continue

  // Check if this file is imported anywhere
  try {
    const result = execSync(
      `grep -rl "${basename}" apps/ packages/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v .next | grep -v "${file}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim()
    if (!result) orphans.push(file)
  } catch {
    orphans.push(file)
  }
}

if (orphans.length === 0) {
  console.log('No obvious orphan files found')
} else {
  console.log(`${orphans.length} potentially unused files:\n`)
  orphans.forEach(f => console.log(`  ${f}`))
  console.log('\nVerify manually before deleting.')
}
