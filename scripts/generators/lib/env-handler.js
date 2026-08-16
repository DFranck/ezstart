/**
 * Env handling for extract-app.js
 *
 * Responsibilities:
 *   - Discover all `process.env.<NAME>` usages in app + transitive packages source
 *   - Read root + per-app .env.local files
 *   - Generate self-contained .env.local + .env.example for the standalone
 *
 * Public API:
 *   - collectEnvVarNames(rootDirs)       -> Set<string>
 *   - parseEnvFile(filePath)             -> Map<string, string>
 *   - mergeEnvSources(rootEnv, perApp)   -> Map<string, string>
 *   - generateEnvFiles(outDir, names, vals, opts) -> { localPath, examplePath, missing }
 */

'use strict'

const fs = require('fs')
const path = require('path')

/**
 * System / runtime vars we never want to copy into a self-contained .env.
 * These come from the OS, the runtime (Node, Next.js), or CI — not user secrets.
 */
const SYSTEM_VARS = new Set([
  'NODE_ENV',
  'PORT',
  'PATH',
  'HOME',
  'USER',
  'USERNAME',
  'PWD',
  'SHELL',
  'LANG',
  'TERM',
  'CI',
  'NEXT_RUNTIME',
  'NEXT_PHASE',
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_URL',
  'VERCEL_REGION',
  'RAILWAY_ENVIRONMENT',
  'RAILWAY_PROJECT_ID',
  'RAILWAY_SERVICE_ID',
])

/**
 * Match valid env var names: `process.env.<NAME>` or `process.env['NAME']`.
 * Name = uppercase letters/digits/underscores. Constraints:
 *   - Must end in alphanumeric (avoids `process.env.NEXT_PUBLIC_*` artifacts
 *     where the `*` stops the match leaving a trailing `_`).
 *   - Must NOT be followed by `_` or `*` in source (avoids `NEXT_PUBLIC` being
 *     captured from `process.env.NEXT_PUBLIC_*` after backtracking).
 */
const ENV_VAR_REGEX =
  /process\.env\.([A-Z_][A-Z0-9_]*[A-Z0-9]|[A-Z])(?![A-Z0-9_*])|process\.env\[['"]([A-Z_][A-Z0-9_]*[A-Z0-9]|[A-Z])['"]\]/g

/** File extensions to scan for env var usage. */
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'])

/** Folders that should never be scanned (build outputs, deps, caches). */
const SKIP_FOLDERS = new Set([
  'node_modules',
  'dist',
  '.next',
  '.turbo',
  '.cache',
  'coverage',
  '.git',
])

/**
 * Recursively walk a directory, yielding every source file path we should scan.
 * @param {string} dir
 * @returns {string[]}
 */
function walkSourceFiles(dir) {
  /** @type {string[]} */
  const out = []
  if (!fs.existsSync(dir)) return out
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') {
      // skip dotfiles except env templates (we don't scan envs anyway)
      if (SKIP_FOLDERS.has(entry.name)) continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_FOLDERS.has(entry.name)) continue
      out.push(...walkSourceFiles(full))
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full)
    }
  }
  return out
}

/**
 * Scan a file for `process.env.<NAME>` usages.
 * @param {string} filePath
 * @returns {Set<string>}
 */
function scanFileForEnvVars(filePath) {
  /** @type {Set<string>} */
  const found = new Set()
  let content
  try {
    content = fs.readFileSync(filePath, 'utf8')
  } catch {
    return found
  }
  let match
  ENV_VAR_REGEX.lastIndex = 0
  while ((match = ENV_VAR_REGEX.exec(content)) !== null) {
    const name = match[1] || match[2]
    if (name && !SYSTEM_VARS.has(name)) found.add(name)
  }
  return found
}

/**
 * Walk multiple roots and collect every distinct `process.env.<NAME>` reference.
 * @param {string[]} rootDirs
 * @returns {Set<string>}
 */
function collectEnvVarNames(rootDirs) {
  /** @type {Set<string>} */
  const all = new Set()
  for (const root of rootDirs) {
    const files = walkSourceFiles(root)
    for (const file of files) {
      const found = scanFileForEnvVars(file)
      for (const name of found) all.add(name)
    }
  }
  return all
}

/**
 * Parse a `.env`-style file into a Map of KEY -> VALUE.
 * Handles `KEY=value`, `KEY="value with spaces"`, `# comments`, blank lines.
 * Does NOT do shell expansion.
 * @param {string} filePath
 * @returns {Map<string, string>}
 */
function parseEnvFile(filePath) {
  /** @type {Map<string, string>} */
  const map = new Map()
  if (!fs.existsSync(filePath)) return map
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) map.set(key, value)
  }
  return map
}

/**
 * Merge env sources, with per-app values overriding root values.
 * @param {Map<string, string>} root
 * @param {Map<string, string>[]} perApp
 * @returns {Map<string, string>}
 */
function mergeEnvSources(root, perApp) {
  /** @type {Map<string, string>} */
  const merged = new Map(root)
  for (const layer of perApp) {
    for (const [k, v] of layer) merged.set(k, v)
  }
  return merged
}

/**
 * Generate `.env.local` (with values) and `.env.example` (with placeholders).
 *
 * @param {string} outDir
 * @param {Set<string>} usedNames - All var names referenced in source.
 * @param {Map<string, string>} valueMap - Merged env values (root + per-app).
 * @param {{ header?: string, placeholder?: string }} [opts]
 * @returns {{ localPath: string, examplePath: string, resolved: string[], missing: string[] }}
 */
function generateEnvFiles(outDir, usedNames, valueMap, opts) {
  const placeholder = (opts && opts.placeholder) || '(set this)'
  const header = (opts && opts.header) || ''

  /** @type {string[]} */
  const resolved = []
  /** @type {string[]} */
  const missing = []

  const sortedNames = [...usedNames].sort()
  for (const name of sortedNames) {
    if (valueMap.has(name)) resolved.push(name)
    else missing.push(name)
  }

  const localLines = []
  const exampleLines = []
  if (header) {
    localLines.push(header, '')
    exampleLines.push(header, '')
  }
  localLines.push('# Auto-generated by extract-app.js — values copied from monorepo .env.local')
  localLines.push('# Standalone repo: edit values as needed for your environment.')
  localLines.push('')
  exampleLines.push('# Auto-generated by extract-app.js — fill in values for your environment.')
  exampleLines.push('')

  for (const name of sortedNames) {
    const value = valueMap.get(name)
    if (value !== undefined) {
      // quote if value contains spaces or special chars
      const needsQuote = /[\s#'"\\$`]/.test(value)
      const written = needsQuote ? `"${value.replace(/"/g, '\\"')}"` : value
      localLines.push(`${name}=${written}`)
    } else {
      localLines.push(`# ${name}=${placeholder}  # NOT FOUND in monorepo env files — set manually`)
    }
    exampleLines.push(`${name}=`)
  }
  localLines.push('')
  exampleLines.push('')

  const localPath = path.join(outDir, '.env.local')
  const examplePath = path.join(outDir, '.env.example')
  fs.writeFileSync(localPath, localLines.join('\n'))
  fs.writeFileSync(examplePath, exampleLines.join('\n'))

  return { localPath, examplePath, resolved, missing }
}

module.exports = {
  SYSTEM_VARS,
  collectEnvVarNames,
  scanFileForEnvVars,
  walkSourceFiles,
  parseEnvFile,
  mergeEnvSources,
  generateEnvFiles,
}
