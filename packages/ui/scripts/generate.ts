#!/usr/bin/env tsx
/**
 * @ezstart/ui — generator orchestrator.
 *
 * Runs every code-generation step owned by this package, in order:
 *   1. CSS theme exports → `src/styles/**\/*.generated.ts`
 *   2. Design-system inspector registry → generated in the ezstart-web app
 *
 * This script is the single entry point invoked by `turbo run generate`
 * (via the `"generate"` script in package.json). Append new generators here.
 */

import { spawnSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const SCRIPTS_DIR = __dirname

type Step = {
  name: string
  runner: 'tsx' | 'node'
  script: string
}

const steps: Step[] = [
  { name: 'theme CSS exports', runner: 'tsx', script: 'generate-theme-exports.ts' },
  { name: 'UI inspector registry', runner: 'node', script: 'generate-ui-registry.cjs' },
]

const isWindows = process.platform === 'win32'
const pnpmBin = isWindows ? 'pnpm.cmd' : 'pnpm'

let failed = false

for (const step of steps) {
  console.log(`\n▶ ${step.name}`)
  const scriptPath = resolve(SCRIPTS_DIR, step.script)

  const result =
    step.runner === 'node'
      ? spawnSync(process.execPath, [scriptPath], { stdio: 'inherit', env: process.env })
      : spawnSync(pnpmBin, ['exec', 'tsx', scriptPath], {
          stdio: 'inherit',
          env: process.env,
          shell: isWindows,
        })

  if (result.status !== 0) {
    console.error(`✖ ${step.name} failed (exit code ${result.status ?? 'n/a'})`)
    failed = true
    break
  }
}

if (failed) {
  process.exit(1)
}

console.log('\n✅ All @ezstart/ui generators completed.')
