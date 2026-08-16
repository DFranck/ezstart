/**
 * CLI smoke tests — guard against API drift in the Railway / Vercel CLIs.
 *
 * Why this file exists (V2 from hacker-A3 report, 2026-06-05):
 *
 * The PUSH-VERCEL-EMPTY-AS-DELETE-001 fix shipped with a Railway CLI call
 * that DID NOT EXIST (`railway variables --remove K1 K2 ...`). The fix
 * passed unit tests (which only covered `loadMergedEnv()` cascade), the
 * audit (which doesn't run the CLI), and the integration was caught only
 * by the hacker who actually invoked the CLI. This test file plugs that
 * gap by spawning the real CLIs (when installed) with `--help` arguments
 * and asserting the subcommands + flags we depend on still exist.
 *
 * Behavior:
 *   - When Railway / Vercel CLI is installed: assert that the subcommands
 *     + flags we use show up in the `--help` output. If a future CLI
 *     upgrade silently renames `variable delete` → `var rm`, this test
 *     fails and we know BEFORE production push.
 *   - When the CLI is NOT installed: tests skip gracefully (CI runners
 *     without the platform CLI just see "skipped", no false negative).
 *
 * Run:
 *   pnpm tsx --test scripts/env/__tests__/cli-smoke.test.ts
 *
 * @see tmp/hack-a3-empty-delete.md V1 + V2
 * @see scripts/env/railway-delete.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

interface CliResult {
  status: number | null
  stdout: string
  stderr: string
}

function runCli(cmd: string, args: string[]): CliResult {
  // shell:true so .cmd shims (Windows global npm/pnpm bins) resolve correctly
  const result = spawnSync(cmd, args, { encoding: 'utf-8', shell: true })
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

function isCliInstalled(cmd: string): boolean {
  try {
    const result = runCli(cmd, ['--version'])
    return result.status === 0
  } catch {
    return false
  }
}

const railwayInstalled = isCliInstalled('railway')
const vercelInstalled = isCliInstalled('vercel')

// ────────────────────────────────────────────────────────────
// Railway CLI smoke tests
// ────────────────────────────────────────────────────────────

describe('Railway CLI smoke — V2 anti-drift', () => {
  it('railway --version succeeds (CLI is installed)', { skip: !railwayInstalled }, () => {
    const result = runCli('railway', ['--version'])
    assert.equal(result.status, 0, `railway --version exited ${result.status}`)
    assert.match(
      result.stdout,
      /railway \d+\.\d+/i,
      'expected version output to contain `railway <semver>`'
    )
  })

  it(
    '`railway variable delete --help` exposes the subcommand we depend on',
    { skip: !railwayInstalled },
    () => {
      const result = runCli('railway', ['variable', 'delete', '--help'])
      assert.equal(
        result.status,
        0,
        `expected exit 0, got ${result.status}\nstderr: ${result.stderr}`
      )
      // Must mention the singular `delete` verb and a <KEY> arg
      const help = (result.stdout + result.stderr).toLowerCase()
      assert.match(help, /delete/, 'help must mention `delete` verb')
      assert.match(help, /<key>/, 'help must mention <KEY> positional arg')
      assert.match(help, /--service/, 'help must mention --service flag')
      assert.match(help, /--environment/, 'help must mention --environment flag')
    }
  )

  it(
    '`railway variables --remove` (the GHOST API) does NOT exist — guard against regression',
    { skip: !railwayInstalled },
    () => {
      // This test exists to catch a future CLI change that adds back a --remove
      // flag. If/when Railway ships a batch remove, we can switch to it for
      // efficiency. Until then, the absence is locked in as a contract.
      const result = runCli('railway', ['variables', '--remove', 'SOMEFAKEKEY', '--help'])
      // Either non-zero exit, OR stderr complains about the unknown flag.
      const combined = (result.stdout + result.stderr).toLowerCase()
      const looksLikeError =
        result.status !== 0 ||
        combined.includes('unexpected argument') ||
        combined.includes('unknown option') ||
        combined.includes('error:')
      assert.ok(
        looksLikeError,
        `Railway CLI now accepts \`variables --remove\` — switch the per-key loop ` +
          `in scripts/env/railway-delete.ts back to a batch call for efficiency.\n` +
          `stdout: ${result.stdout.slice(0, 200)}\nstderr: ${result.stderr.slice(0, 200)}`
      )
    }
  )
})

// ────────────────────────────────────────────────────────────
// Vercel CLI smoke tests
// ────────────────────────────────────────────────────────────

describe('Vercel CLI smoke — V2 anti-drift', () => {
  it('vercel --version succeeds (CLI is installed)', { skip: !vercelInstalled }, () => {
    const result = runCli('vercel', ['--version'])
    assert.equal(result.status, 0, `vercel --version exited ${result.status}`)
    assert.match(result.stdout, /\d+\.\d+/, 'expected version output containing semver')
  })

  it(
    '`vercel env rm --help` exposes the --yes flag we depend on',
    { skip: !vercelInstalled },
    () => {
      const result = runCli('vercel', ['env', 'rm', '--help'])
      // vercel CLI exits 2 from `--help` on some versions (intentional design).
      const exitOk = result.status === 0 || result.status === 2
      assert.ok(exitOk, `unexpected exit code ${result.status}\nstderr: ${result.stderr}`)
      const help = (result.stdout + result.stderr).toLowerCase()
      assert.match(help, /env rm|env remove/, 'help must mention env rm/remove')
      assert.match(help, /--yes/, 'help must mention --yes flag (skip confirmation)')
    }
  )
})
