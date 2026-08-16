/**
 * Tests for env-handler.js — runs via `node --test`.
 *
 * Run:
 *   node --test scripts/generators/lib/env-handler.test.js
 */

'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  scanFileForEnvVars,
  collectEnvVarNames,
  parseEnvFile,
  mergeEnvSources,
  generateEnvFiles,
  SYSTEM_VARS,
} = require('./env-handler')

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'env-handler-test-'))
}

test('scanFileForEnvVars: detects process.env.<NAME> patterns', () => {
  const dir = makeTmpDir()
  const file = path.join(dir, 'sample.ts')
  fs.writeFileSync(
    file,
    [
      "const apiKey = process.env.GEMINI_API_KEY || ''",
      "const url = process.env['NEXT_PUBLIC_API_URL']",
      "if (process.env.NODE_ENV === 'development') {}",
      'const port = process.env.PORT || 3000',
      'const stripeKey = process.env.STRIPE_SECRET_KEY',
    ].join('\n')
  )
  const found = scanFileForEnvVars(file)
  assert.ok(found.has('GEMINI_API_KEY'))
  assert.ok(found.has('NEXT_PUBLIC_API_URL'))
  assert.ok(found.has('STRIPE_SECRET_KEY'))
  // System vars excluded
  assert.ok(!found.has('NODE_ENV'))
  assert.ok(!found.has('PORT'))
})

test('scanFileForEnvVars: ignores trailing-underscore artifacts in comments', () => {
  const dir = makeTmpDir()
  const file = path.join(dir, 'doc.ts')
  fs.writeFileSync(
    file,
    [
      '// Next.js statically replaces `process.env.NEXT_PUBLIC_*` at build time.',
      '/** Reads from process.env.NEXT_PUBLIC_EZAUTH_KEY */',
      'const real = process.env.NEXT_PUBLIC_EZAUTH_KEY',
    ].join('\n')
  )
  const found = scanFileForEnvVars(file)
  // Real var captured
  assert.ok(found.has('NEXT_PUBLIC_EZAUTH_KEY'))
  // Bogus trailing-underscore artifact NOT captured
  assert.ok(!found.has('NEXT_PUBLIC_'))
})

test('scanFileForEnvVars: missing file returns empty set', () => {
  const found = scanFileForEnvVars('/path/that/does/not/exist.ts')
  assert.equal(found.size, 0)
})

test('collectEnvVarNames: walks directories and dedupes', () => {
  const dir = makeTmpDir()
  fs.mkdirSync(path.join(dir, 'src'))
  fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'process.env.FOO; process.env.BAR')
  fs.writeFileSync(path.join(dir, 'src', 'b.tsx'), 'process.env.FOO; process.env.BAZ')
  fs.mkdirSync(path.join(dir, 'src', 'node_modules'))
  fs.writeFileSync(
    path.join(dir, 'src', 'node_modules', 'leak.ts'),
    'process.env.SHOULD_NOT_BE_SEEN'
  )
  const names = collectEnvVarNames([dir])
  assert.deepEqual([...names].sort(), ['BAR', 'BAZ', 'FOO'])
  assert.ok(!names.has('SHOULD_NOT_BE_SEEN'))
})

test('parseEnvFile: handles comments, blanks, quoted values', () => {
  const dir = makeTmpDir()
  const file = path.join(dir, '.env')
  fs.writeFileSync(
    file,
    [
      '# comment',
      '',
      'PLAIN=value1',
      'QUOTED="hello world"',
      "SINGLE='abc'",
      'WITH_EQ=key=val=stuff',
      '   # indented comment',
      'TRAILING=  spaces  ',
    ].join('\n')
  )
  const map = parseEnvFile(file)
  assert.equal(map.get('PLAIN'), 'value1')
  assert.equal(map.get('QUOTED'), 'hello world')
  assert.equal(map.get('SINGLE'), 'abc')
  assert.equal(map.get('WITH_EQ'), 'key=val=stuff')
  assert.equal(map.get('TRAILING'), 'spaces')
})

test('parseEnvFile: missing file returns empty map', () => {
  const map = parseEnvFile('/nope.env')
  assert.equal(map.size, 0)
})

test('mergeEnvSources: per-app overrides root', () => {
  const root = new Map([
    ['SHARED', 'root-value'],
    ['ONLY_ROOT', 'r'],
  ])
  const api = new Map([
    ['SHARED', 'api-override'],
    ['ONLY_API', 'a'],
  ])
  const web = new Map([['ONLY_WEB', 'w']])
  const merged = mergeEnvSources(root, [api, web])
  assert.equal(merged.get('SHARED'), 'api-override')
  assert.equal(merged.get('ONLY_ROOT'), 'r')
  assert.equal(merged.get('ONLY_API'), 'a')
  assert.equal(merged.get('ONLY_WEB'), 'w')
})

test('generateEnvFiles: writes .env.local + .env.example with resolved + missing split', () => {
  const dir = makeTmpDir()
  const used = new Set(['HAVE_THIS', 'NOT_FOUND', 'WITH_SPACES'])
  const values = new Map([
    ['HAVE_THIS', 'plain-value'],
    ['WITH_SPACES', 'hello world'],
  ])
  const result = generateEnvFiles(dir, used, values, { header: '# header line' })

  assert.deepEqual(result.resolved.sort(), ['HAVE_THIS', 'WITH_SPACES'])
  assert.deepEqual(result.missing, ['NOT_FOUND'])

  const local = fs.readFileSync(result.localPath, 'utf8')
  assert.match(local, /HAVE_THIS=plain-value/)
  // Quoted because of space
  assert.match(local, /WITH_SPACES="hello world"/)
  // Missing var commented out
  assert.match(local, /# NOT_FOUND=/)
  assert.match(local, /# header line/)

  const example = fs.readFileSync(result.examplePath, 'utf8')
  assert.match(example, /HAVE_THIS=/)
  assert.match(example, /WITH_SPACES=/)
  assert.match(example, /NOT_FOUND=/)
  // Example should NOT carry secret values
  assert.ok(!example.includes('plain-value'))
})

test('SYSTEM_VARS contains common runtime vars', () => {
  for (const v of ['NODE_ENV', 'PORT', 'PATH', 'NEXT_RUNTIME', 'VERCEL_ENV']) {
    assert.ok(SYSTEM_VARS.has(v), `expected ${v} to be skipped`)
  }
})
