#!/usr/bin/env node

/**
 * Quick Health Check - Simplified Version
 *
 * Fast 5-minute health check of critical metrics.
 * For detailed audits, see docs/AUDIT-GUIDE.md
 */

const { execSync } = require('child_process')

function exec(command) {
  try {
    return {
      success: true,
      output: execSync(command, { encoding: 'utf-8', stdio: 'pipe' })
    }
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || ''
    }
  }
}

console.log('\n═══════════════════════════════════════════════════')
console.log('     🏥 QUICK HEALTH CHECK - @ezstart')
console.log('═══════════════════════════════════════════════════\n')

const checks = []
let passCount = 0

// NPM Vulnerabilities
console.log('📦 Checking npm vulnerabilities...')
const audit = exec('pnpm audit --json')
let vulns = 0
try {
  const data = JSON.parse(audit.output)
  vulns = data.metadata?.vulnerabilities?.total || 0
} catch (e) {
  // Fallback
}

if (vulns === 0) {
  console.log('   ✅ No vulnerabilities\n')
  passCount++
} else {
  console.log(`   ❌ ${vulns} vulnerabilities found\n`)
}
checks.push({ name: 'NPM Security', pass: vulns === 0 })

// TypeScript
console.log('📘 Checking TypeScript...')
const ts = exec('pnpm typecheck')
if (ts.success) {
  console.log('   ✅ No TypeScript errors\n')
  passCount++
  checks.push({ name: 'TypeScript', pass: true })
} else {
  console.log('   ❌ TypeScript errors found\n')
  checks.push({ name: 'TypeScript', pass: false })
}

// ESLint
console.log('🔍 Checking ESLint...')
const lint = exec('pnpm lint')
if (lint.success) {
  console.log('   ✅ No ESLint errors\n')
  passCount++
  checks.push({ name: 'ESLint', pass: true })
} else {
  console.log('   ⚠️  ESLint issues found\n')
  checks.push({ name: 'ESLint', pass: false })
}

// Build
console.log('🏗️  Checking build...')
const build = exec('pnpm build')
if (build.success) {
  console.log('   ✅ Build successful\n')
  passCount++
  checks.push({ name: 'Build', pass: true })
} else {
  console.log('   ❌ Build failed\n')
  checks.push({ name: 'Build', pass: false })
}

// Summary
console.log('═══════════════════════════════════════════════════')
console.log('                  📊 SUMMARY')
console.log('═══════════════════════════════════════════════════\n')

checks.forEach(check => {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}`)
})

const score = Math.round((passCount / checks.length) * 100)
console.log(`\n   HEALTH SCORE: ${score}/100`)

if (score === 100) {
  console.log('\n🎉 PERFECT! All checks passed!')
} else if (score >= 75) {
  console.log('\n👍 GOOD! Some improvements needed.')
} else if (score >= 50) {
  console.log('\n⚠️  FAIR - Action required.')
} else {
  console.log('\n🚨 CRITICAL - Immediate fixes needed!')
}

console.log('\n📖 For detailed audits: docs/AUDIT-GUIDE.md\n')

process.exit(score >= 75 ? 0 : 1)
