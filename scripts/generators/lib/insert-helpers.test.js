/**
 * Tests for insert-helpers.js — runs via `node --test`.
 *
 * Run:
 *   node --test scripts/generators/lib/insert-helpers.test.js
 */

'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  detectLayer,
  detectStandaloneLayout,
  diffEnvAgainstRoot,
  transformPackageJson,
  inferOriginalAppName,
} = require('./insert-helpers')

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'insert-helpers-test-'))
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

// ---------------------------------------------------------------------------
// detectLayer
// ---------------------------------------------------------------------------

test('detectLayer: detects web via next.config.mjs', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'next.config.mjs'), 'export default {}')
  assert.equal(detectLayer(dir), 'web')
})

test('detectLayer: detects web via next-env.d.ts', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'next-env.d.ts'), '/// <reference types="next" />')
  assert.equal(detectLayer(dir), 'web')
})

test('detectLayer: detects web via src/app directory', () => {
  const dir = makeTmpDir()
  fs.mkdirSync(path.join(dir, 'src', 'app'), { recursive: true })
  assert.equal(detectLayer(dir), 'web')
})

test('detectLayer: detects api via src/server.ts', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'src', 'server.ts'), 'import express from "express"\n')
  assert.equal(detectLayer(dir), 'api')
})

test('detectLayer: detects api via src/index.ts with express import', () => {
  const dir = makeTmpDir()
  writeFile(
    path.join(dir, 'src', 'index.ts'),
    `import { createEzstartServer } from '@ezstart/api-core'\nconst app = createEzstartServer('foo')\napp.listen(3000)\n`
  )
  assert.equal(detectLayer(dir), 'api')
})

test('detectLayer: detects types via package.json name', () => {
  const dir = makeTmpDir()
  writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: '@my-app/types', version: '0.1.0' })
  )
  writeFile(path.join(dir, 'src', 'index.ts'), 'export {}\n')
  assert.equal(detectLayer(dir), 'types')
})

test('detectLayer: returns null for unknown dirs', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'README.md'), '# nothing')
  assert.equal(detectLayer(dir), null)
})

test('detectLayer: returns null for non-existent dirs', () => {
  assert.equal(detectLayer('/path/that/does/not/exist'), null)
})

// ---------------------------------------------------------------------------
// detectStandaloneLayout
// ---------------------------------------------------------------------------

test('detectStandaloneLayout: multi-layer with web + api + types', () => {
  const dir = makeTmpDir()
  // web layer
  writeFile(path.join(dir, 'web', 'next.config.mjs'), 'export default {}')
  writeFile(path.join(dir, 'web', 'package.json'), JSON.stringify({ name: 'web-foo' }))
  // api layer
  writeFile(path.join(dir, 'api', 'src', 'server.ts'), 'import express from "express"\n')
  writeFile(path.join(dir, 'api', 'package.json'), JSON.stringify({ name: 'api-foo' }))
  // types layer
  writeFile(path.join(dir, 'types', 'package.json'), JSON.stringify({ name: '@foo/types' }))
  writeFile(path.join(dir, 'types', 'src', 'index.ts'), 'export {}\n')

  const layout = detectStandaloneLayout(dir)
  assert.equal(layout.mode, 'multi')
  assert.equal(layout.layers.length, 3)
  const names = layout.layers.map(l => l.name).sort()
  assert.deepEqual(names, ['api', 'types', 'web'])
})

test('detectStandaloneLayout: single-layer web standalone', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'next.config.mjs'), 'export default {}')
  writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'my-web' }))

  const layout = detectStandaloneLayout(dir)
  assert.equal(layout.mode, 'single')
  assert.equal(layout.layers.length, 1)
  assert.equal(layout.layers[0].name, 'web')
})

test('detectStandaloneLayout: returns empty layers for undetectable projects', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'README.md'), '# empty')
  const layout = detectStandaloneLayout(dir)
  assert.equal(layout.layers.length, 0)
})

// ---------------------------------------------------------------------------
// diffEnvAgainstRoot
// ---------------------------------------------------------------------------

test('diffEnvAgainstRoot: matches become shared, differs go per-app', () => {
  const root = new Map([
    ['JWT_SECRET', 'abc123'],
    ['MONGO_URL', 'mongodb://root'],
    ['DEPLOY_ENV', 'local'],
  ])
  const standalone = new Map([
    ['JWT_SECRET', 'abc123'], // matches root -> shared
    ['MONGO_URL', 'mongodb://override'], // differs -> per-app
    ['STRIPE_KEY', 'sk_live_xxx'], // new -> per-app
  ])

  const { sharedMatches, perApp } = diffEnvAgainstRoot(standalone, root)
  assert.deepEqual(sharedMatches, ['JWT_SECRET'])
  assert.equal(perApp.size, 2)
  assert.equal(perApp.get('MONGO_URL'), 'mongodb://override')
  assert.equal(perApp.get('STRIPE_KEY'), 'sk_live_xxx')
})

test('diffEnvAgainstRoot: empty root sends everything to per-app', () => {
  const root = new Map()
  const standalone = new Map([
    ['A', '1'],
    ['B', '2'],
  ])
  const { sharedMatches, perApp } = diffEnvAgainstRoot(standalone, root)
  assert.deepEqual(sharedMatches, [])
  assert.equal(perApp.size, 2)
})

// ---------------------------------------------------------------------------
// transformPackageJson
// ---------------------------------------------------------------------------

test('transformPackageJson: normalizes web name and rewrites @ezstart deps', () => {
  const input = {
    name: 'web-foo-standalone',
    version: '0.1.0',
    dependencies: {
      '@ezstart/ui': '^1.0.0',
      '@ezstart/auth-sdk': '1.2.3',
      next: '14.0.0',
    },
    devDependencies: {
      '@ezstart/typescript-config': 'workspace:*',
      typescript: '5.0.0',
    },
  }

  const out = transformPackageJson(input, 'green-pulse', 'web')
  assert.equal(out.name, 'web-green-pulse')
  assert.equal(out.version, '0.1.0')
  assert.deepEqual(out.dependencies, {
    '@ezstart/ui': 'workspace:*',
    '@ezstart/auth-sdk': 'workspace:*',
    next: '14.0.0',
  })
  assert.deepEqual(out.devDependencies, {
    '@ezstart/typescript-config': 'workspace:*',
    typescript: '5.0.0',
  })
})

test('transformPackageJson: api layer gets api-<name> naming', () => {
  const out = transformPackageJson({ name: 'whatever' }, 'ezpay', 'api')
  assert.equal(out.name, 'api-ezpay')
})

test('transformPackageJson: types layer gets @<app>/types naming', () => {
  const out = transformPackageJson({ name: 'whatever' }, 'ezpay', 'types')
  assert.equal(out.name, '@ezpay/types')
})

test('transformPackageJson: preserves scripts and other fields', () => {
  const input = {
    name: 'old',
    scripts: { dev: 'next dev', build: 'next build' },
    private: true,
    type: 'module',
  }
  const out = transformPackageJson(input, 'myapp', 'web')
  assert.deepEqual(out.scripts, { dev: 'next dev', build: 'next build' })
  assert.equal(out.private, true)
  assert.equal(out.type, 'module')
})

test('transformPackageJson: handles missing deps gracefully', () => {
  const out = transformPackageJson({}, 'myapp', 'web')
  assert.equal(out.name, 'web-myapp')
})

test('transformPackageJson: rewrites @<originalAppName>/<sub> -> @<appName>/<sub>', () => {
  const input = {
    name: 'web-green-pulse-standalone',
    dependencies: {
      '@green-pulse/types': 'workspace:*',
      '@ezstart/ui': '^1.0.0',
      next: '14.0.0',
    },
  }
  const out = transformPackageJson(input, 'test-imported', 'web', {
    originalAppName: 'green-pulse',
  })
  assert.equal(out.name, 'web-test-imported')
  assert.deepEqual(out.dependencies, {
    '@test-imported/types': 'workspace:*',
    '@ezstart/ui': 'workspace:*',
    next: '14.0.0',
  })
})

test('transformPackageJson: no cross-layer rewrite when originalAppName omitted', () => {
  const input = {
    name: 'web-green-pulse-standalone',
    dependencies: {
      '@green-pulse/types': 'workspace:*',
    },
  }
  const out = transformPackageJson(input, 'test-imported', 'web')
  assert.deepEqual(out.dependencies, { '@green-pulse/types': 'workspace:*' })
})

// ---------------------------------------------------------------------------
// inferOriginalAppName
// ---------------------------------------------------------------------------

test('inferOriginalAppName: extracts <name> from "<name>-standalone"', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'green-pulse-standalone' }))
  assert.equal(inferOriginalAppName(dir), 'green-pulse')
})

test('inferOriginalAppName: accepts plain kebab-case name fallback', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'my-app' }))
  assert.equal(inferOriginalAppName(dir), 'my-app')
})

test('inferOriginalAppName: returns null for missing package.json', () => {
  const dir = makeTmpDir()
  assert.equal(inferOriginalAppName(dir), null)
})

test('inferOriginalAppName: returns null for non-kebab names', () => {
  const dir = makeTmpDir()
  writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'WeirdName' }))
  assert.equal(inferOriginalAppName(dir), null)
})
