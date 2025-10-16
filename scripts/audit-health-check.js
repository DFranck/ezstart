#!/usr/bin/env node

/**
 * Quick Health Check Script
 *
 * Run this script weekly to get a quick overview of monorepo health.
 * For detailed audits, see docs/AUDIT-GUIDE.md
 *
 * Usage: node scripts/audit-health-check.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function exec(command, silent = false) {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    })
    return { success: true, output }
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message
    }
  }
}

function countLines(pattern, searchPath = 'apps packages') {
  // For Windows compatibility, use simpler approach
  try {
    const result = exec(
      `grep -r "${pattern}" ${searchPath} --include="*.ts" --include="*.tsx" 2>nul | find /c /v ""`,
      true
    )
    return parseInt(result.output?.trim() || '0')
  } catch (e) {
    // Fallback if grep fails
    return 0
  }
}

console.log('\n')
log('═══════════════════════════════════════════════════', 'blue')
log('     🏥 MONOREPO HEALTH CHECK - @ezstart', 'blue')
log('═══════════════════════════════════════════════════', 'blue')
console.log('\n')

const checks = []

// ============================================================================
// 🔒 SECURITY CHECKS
// ============================================================================

log('🔒 Security Checks', 'magenta')
log('─────────────────────────────────────────────────', 'magenta')

// Check 1: NPM Vulnerabilities
log('\n📦 Checking npm vulnerabilities...', 'blue')
const auditResult = exec('pnpm audit --json', true)
let vulnCount = 0
let highVulns = 0

try {
  if (auditResult.output) {
    const auditData = JSON.parse(auditResult.output)
    if (auditData.metadata?.vulnerabilities) {
      const vulns = auditData.metadata.vulnerabilities
      vulnCount = vulns.total || 0
      highVulns = (vulns.high || 0) + (vulns.critical || 0)
    }
  }
} catch (e) {
  // Fallback: parse text output
  const lines = auditResult.output.split('\n')
  const vulnLine = lines.find(l => l.includes('vulnerabilities'))
  if (vulnLine) {
    const match = vulnLine.match(/(\d+) vulnerabilities/)
    vulnCount = match ? parseInt(match[1]) : 0
  }
}

if (vulnCount === 0) {
  log(`   ✅ No vulnerabilities found`, 'green')
  checks.push({ name: 'NPM Vulnerabilities', status: '✅', score: 100 })
} else if (highVulns === 0) {
  log(`   ⚠️  ${vulnCount} low/moderate vulnerabilities`, 'yellow')
  checks.push({ name: 'NPM Vulnerabilities', status: '🟡', score: 70 })
} else {
  log(`   ❌ ${highVulns} high/critical vulnerabilities!`, 'red')
  checks.push({ name: 'NPM Vulnerabilities', status: '🔴', score: 30 })
}

// Check 2: Hardcoded Secrets
log('\n🔑 Checking for hardcoded secrets...', 'blue')
const secretPatterns = [
  'mongodb+srv',
  'sk_live',
  'sk_test',
  'JWT_SECRET.*=.*[\'"]\\w{20}',
]

let secretsFound = 0
secretPatterns.forEach(pattern => {
  const count = countLines(pattern)
  if (count > 0) {
    log(`   ⚠️  Found "${pattern}" in ${count} files`, 'yellow')
    secretsFound += count
  }
})

if (secretsFound === 0) {
  log(`   ✅ No hardcoded secrets detected`, 'green')
  checks.push({ name: 'Hardcoded Secrets', status: '✅', score: 100 })
} else {
  log(`   ❌ ${secretsFound} potential secrets found!`, 'red')
  checks.push({ name: 'Hardcoded Secrets', status: '🔴', score: 0 })
}

// Check 3: CORS Configuration
log('\n🌐 Checking CORS configuration...', 'blue')
const corsWildcards = countLines("origin: '\\*'\\|credentials: true.*origin: '\\*'")
if (corsWildcards === 0) {
  log(`   ✅ No wildcard CORS with credentials`, 'green')
  checks.push({ name: 'CORS Security', status: '✅', score: 100 })
} else {
  log(`   ⚠️  ${corsWildcards} potential CORS wildcards`, 'yellow')
  checks.push({ name: 'CORS Security', status: '🟡', score: 60 })
}

// ============================================================================
// 📊 CODE QUALITY CHECKS
// ============================================================================

console.log('\n')
log('📊 Code Quality Checks', 'magenta')
log('─────────────────────────────────────────────────', 'magenta')

// Check 4: TypeScript Errors
log('\n📘 Checking TypeScript...', 'blue')
const tsResult = exec('pnpm typecheck 2>&1 | grep -c "error TS" || echo "0"', true)
const tsErrors = parseInt(tsResult.output?.trim() || '0')

if (tsErrors === 0) {
  log(`   ✅ No TypeScript errors`, 'green')
  checks.push({ name: 'TypeScript', status: '✅', score: 100 })
} else if (tsErrors < 10) {
  log(`   ⚠️  ${tsErrors} TypeScript errors`, 'yellow')
  checks.push({ name: 'TypeScript', status: '🟡', score: 70 })
} else {
  log(`   ❌ ${tsErrors} TypeScript errors!`, 'red')
  checks.push({ name: 'TypeScript', status: '🔴', score: 30 })
}

// Check 5: ESLint Issues
log('\n🔍 Checking ESLint...', 'blue')
const lintResult = exec('pnpm lint 2>&1 | grep -E "problem|error|warning" || echo "0"', true)
const lintOutput = lintResult.output || ''
const lintErrors = (lintOutput.match(/error/gi) || []).length
const lintWarnings = (lintOutput.match(/warning/gi) || []).length

if (lintErrors === 0 && lintWarnings === 0) {
  log(`   ✅ No ESLint issues`, 'green')
  checks.push({ name: 'ESLint', status: '✅', score: 100 })
} else if (lintErrors === 0) {
  log(`   ⚠️  ${lintWarnings} ESLint warnings`, 'yellow')
  checks.push({ name: 'ESLint', status: '🟡', score: 80 })
} else {
  log(`   ❌ ${lintErrors} ESLint errors, ${lintWarnings} warnings`, 'red')
  checks.push({ name: 'ESLint', status: '🔴', score: 40 })
}

// Check 6: Console.log usage
log('\n🪵 Checking for debug logs...', 'blue')
const consoleLogs = countLines('console\\.log')
if (consoleLogs < 10) {
  log(`   ✅ Only ${consoleLogs} console.log statements`, 'green')
  checks.push({ name: 'Debug Logs', status: '✅', score: 100 })
} else if (consoleLogs < 50) {
  log(`   ⚠️  ${consoleLogs} console.log statements`, 'yellow')
  checks.push({ name: 'Debug Logs', status: '🟡', score: 70 })
} else {
  log(`   ❌ ${consoleLogs} console.log statements!`, 'red')
  checks.push({ name: 'Debug Logs', status: '🔴', score: 40 })
}

// Check 7: TypeScript 'any' usage
log('\n🔷 Checking for "any" types...', 'blue')
const anyCount = countLines(': any\\|as any')
if (anyCount < 20) {
  log(`   ✅ Only ${anyCount} "any" usages`, 'green')
  checks.push({ name: 'TypeScript Any', status: '✅', score: 100 })
} else if (anyCount < 100) {
  log(`   ⚠️  ${anyCount} "any" usages`, 'yellow')
  checks.push({ name: 'TypeScript Any', status: '🟡', score: 60 })
} else {
  log(`   ❌ ${anyCount} "any" usages!`, 'red')
  checks.push({ name: 'TypeScript Any', status: '🔴', score: 30 })
}

// ============================================================================
// 📦 DEPENDENCIES CHECKS
// ============================================================================

console.log('\n')
log('📦 Dependencies Checks', 'magenta')
log('─────────────────────────────────────────────────', 'magenta')

// Check 8: Outdated Packages
log('\n📅 Checking for outdated packages...', 'blue')
const outdatedResult = exec('pnpm outdated --recursive 2>&1 | grep -c "Package" || echo "0"', true)
const outdatedCount = parseInt(outdatedResult.output?.trim() || '0')

if (outdatedCount === 0) {
  log(`   ✅ All packages up to date`, 'green')
  checks.push({ name: 'Outdated Packages', status: '✅', score: 100 })
} else if (outdatedCount < 10) {
  log(`   ⚠️  ${outdatedCount} outdated packages`, 'yellow')
  checks.push({ name: 'Outdated Packages', status: '🟡', score: 70 })
} else {
  log(`   ❌ ${outdatedCount} outdated packages!`, 'red')
  checks.push({ name: 'Outdated Packages', status: '🔴', score: 40 })
}

// Check 9: Duplicate Dependencies
log('\n📋 Checking for duplicate dependencies...', 'blue')
const dedupeResult = exec('pnpm dedupe --check 2>&1', true)
if (dedupeResult.success) {
  log(`   ✅ No duplicate dependencies`, 'green')
  checks.push({ name: 'Duplicate Deps', status: '✅', score: 100 })
} else {
  log(`   ⚠️  Found duplicate dependencies`, 'yellow')
  checks.push({ name: 'Duplicate Deps', status: '🟡', score: 70 })
}

// ============================================================================
// 🎯 SUMMARY
// ============================================================================

console.log('\n')
log('═══════════════════════════════════════════════════', 'blue')
log('                  📊 SUMMARY', 'blue')
log('═══════════════════════════════════════════════════', 'blue')
console.log('\n')

const totalScore = Math.round(
  checks.reduce((sum, check) => sum + check.score, 0) / checks.length
)

checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(30)} ${check.score}/100`)
})

console.log('\n')
log('─────────────────────────────────────────────────', 'blue')
console.log(`   OVERALL HEALTH SCORE: ${totalScore}/100`)
log('─────────────────────────────────────────────────', 'blue')
console.log('\n')

// Status interpretation
if (totalScore >= 90) {
  log('🎉 EXCELLENT! Monorepo is in great health!', 'green')
  log('   Keep up the good work!', 'green')
} else if (totalScore >= 70) {
  log('👍 GOOD! Some improvements needed.', 'yellow')
  log('   Check items marked with 🟡 or 🔴', 'yellow')
} else if (totalScore >= 50) {
  log('⚠️  FAIR - Action required this month.', 'yellow')
  log('   Focus on 🔴 items first.', 'yellow')
} else {
  log('🚨 CRITICAL - Immediate action required!', 'red')
  log('   Address all 🔴 items this week.', 'red')
}

console.log('\n')
log('📖 For detailed audits, see: docs/AUDIT-GUIDE.md', 'blue')
log('📝 Run full audits: docs/audits/[TYPE]-AUDIT.md', 'blue')
console.log('\n')

// Save results to JSON
const reportPath = path.join(__dirname, '..', 'health-check-report.json')
const report = {
  date: new Date().toISOString(),
  score: totalScore,
  checks,
}

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
log(`💾 Full report saved to: health-check-report.json`, 'blue')
console.log('\n')

// Exit with appropriate code
process.exit(totalScore >= 70 ? 0 : 1)
