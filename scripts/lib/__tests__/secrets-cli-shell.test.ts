/**
 * Regression tests for CLI subprocess invocation.
 *
 * These guard against two production incidents:
 *
 *   1. Windows shell escape on Railway — `railway variable set KEY=VALUE`
 *      spawned with `{ shell: true }` was mangling values containing `&`
 *      because cmd.exe interprets `&` as a command separator. The fix is
 *      to use `variable set --stdin KEY` with the value on stdin.
 *
 *   2. Vercel preview env add — CLI 50+ requires a positional `gitbranch`
 *      argument (empty string selects "all preview branches") AND the
 *      `--value` flag in non-interactive mode.
 *
 * We mock `node:child_process.spawnSync` so we can assert the exact args /
 * stdin bytes we pass to the CLI without hitting the network.
 *
 * Run:
 *   pnpm tsx --test scripts/lib/__tests__/secrets-cli-shell.test.ts
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import childProcess from 'node:child_process'
import type { SpawnSyncReturns } from 'node:child_process'

type SpawnCall = {
  cmd: string
  args: readonly string[]
  input: string | undefined
  shell: boolean
}

// ──────────────────────────────────────────────────────────────
// spawnSync mock
// ──────────────────────────────────────────────────────────────

let calls: SpawnCall[] = []
const originalSpawnSync = childProcess.spawnSync

function fakeResult(overrides: Partial<SpawnSyncReturns<Buffer>> = {}): SpawnSyncReturns<Buffer> {
  return {
    pid: 1,
    output: [],
    stdout: Buffer.from(''),
    stderr: Buffer.from(''),
    status: 0,
    signal: null,
    ...overrides,
  } as SpawnSyncReturns<Buffer>
}

function installMock(
  resolver: (cmd: string, args: readonly string[]) => SpawnSyncReturns<Buffer> = () => fakeResult()
): void {
  calls = []
  // @ts-expect-error — test-only mock of the entire function
  childProcess.spawnSync = (
    cmd: string,
    args: readonly string[],
    opts: { input?: string; shell?: boolean } = {}
  ): SpawnSyncReturns<Buffer> => {
    calls.push({
      cmd,
      args: [...args],
      input: typeof opts.input === 'string' ? opts.input : undefined,
      shell: Boolean(opts.shell),
    })
    return resolver(cmd, args)
  }
}

function restoreMock(): void {
  // @ts-expect-error — restore
  childProcess.spawnSync = originalSpawnSync
}

// Re-import AFTER the mock is installed so the module captures the mocked fn.
// Note: Node test runner runs each `describe` top-to-bottom with shared module
// cache, so we install/reset the mock per test via before/afterEach hooks.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lib: any

async function loadLib(): Promise<void> {
  // Bust module cache so it re-reads the mocked spawnSync each time.
  // tsx ESM loader: re-import with a cache-busting query string.
  const url = new URL('../secrets-cli.ts', import.meta.url)
  url.searchParams.set('t', String(Date.now() + Math.random()))
  lib = await import(url.href)
}

// ──────────────────────────────────────────────────────────────
// Railway: shell-escape regression
// ──────────────────────────────────────────────────────────────

describe('railwaySetVar — Windows shell escape regression', () => {
  beforeEach(async () => {
    installMock()
    await loadLib()
  })
  afterEach(() => {
    restoreMock()
  })

  it('uses `variable set --stdin <KEY>` (not KEY=VALUE inline)', () => {
    lib.railwaySetVar('JWT_SECRET', 'abc123')
    assert.equal(calls.length, 1)
    const call = calls[0]
    assert.equal(call.cmd, 'railway')
    assert.deepEqual(call.args, ['variable', 'set', '--stdin', 'JWT_SECRET'])
  })

  it('passes the raw value via stdin (no shell-quoting involved)', () => {
    const mongoUrl =
      'mongodb+srv://user:pwd@cluster.mongodb.net/db?retryWrites=true&w=majority&appName=Cluster0'
    lib.railwaySetVar('MONGO_URL', mongoUrl)
    assert.equal(calls.length, 1)
    const call = calls[0]
    // CRITICAL: the ampersands MUST survive untouched as stdin bytes
    assert.equal(call.input, mongoUrl)
    // And the arg list MUST NOT contain the value — otherwise cmd.exe
    // would mangle it on Windows.
    assert.ok(
      !call.args.some(a => a.includes('&')),
      `ampersand leaked into argv: ${JSON.stringify(call.args)}`
    )
  })

  it('never concatenates KEY=VALUE into argv (legacy shape that broke on Windows)', () => {
    lib.railwaySetVar('KEY', 'value&with&ampersands')
    const call = calls[0]
    for (const arg of call.args) {
      assert.ok(!arg.startsWith('KEY='), `legacy KEY=VALUE shape leaked back into argv: ${arg}`)
    }
  })
})

describe('railwayDeleteVar — CLI-supported non-interactive delete', () => {
  beforeEach(async () => {
    installMock()
    await loadLib()
  })
  afterEach(() => {
    restoreMock()
  })

  it('invokes `railway variable delete <KEY>`', () => {
    lib.railwayDeleteVar('STALE_VAR')
    assert.equal(calls.length, 1)
    const call = calls[0]
    assert.equal(call.cmd, 'railway')
    assert.deepEqual(call.args, ['variable', 'delete', 'STALE_VAR'])
  })

  it('surfaces stderr when the CLI rejects the op', async () => {
    installMock(() =>
      fakeResult({
        status: 1,
        stderr: Buffer.from('error: unknown command "delete"\n'),
      })
    )
    await loadLib()
    const res = lib.railwayDeleteVar('X')
    assert.equal(res.ok, false)
    assert.ok(res.stderr.includes('unknown command'))
    assert.equal(res.status, 1)
  })
})

// ──────────────────────────────────────────────────────────────
// Vercel: preview gitbranch regression
// ──────────────────────────────────────────────────────────────

describe('vercelEnvAdd — preview gitbranch regression', () => {
  beforeEach(async () => {
    installMock()
    await loadLib()
    // The scope is resolved from env vars; set one so the test is deterministic
    process.env.VERCEL_SCOPE = 'ezstart'
  })
  afterEach(() => {
    restoreMock()
    delete process.env.VERCEL_SCOPE
  })

  it('passes empty gitbranch positional for preview to select "all preview branches"', () => {
    lib.vercelEnvAdd('MY_KEY', 'my-value', 'staging', '/tmp/projdir')
    assert.equal(calls.length, 1)
    const call = calls[0]
    assert.equal(call.cmd, 'vercel')
    // On Windows, execCapture normalizes '' → '""' so cmd.exe preserves the
    // positional. Both spellings are acceptable for this assertion.
    const emptyArg = process.platform === 'win32' ? '""' : ''
    assert.deepEqual(
      call.args,
      [
        'env',
        'add',
        'MY_KEY',
        'preview',
        emptyArg,
        '--force',
        '--yes',
        '--cwd',
        '/tmp/projdir',
        '--scope',
        'ezstart',
      ],
      `unexpected argv: ${JSON.stringify(call.args)}`
    )
  })

  it('on Windows, emits "" (literal) instead of empty string to survive cmd.exe arg dropping', () => {
    if (process.platform !== 'win32') return
    lib.vercelEnvAdd('K', 'v', 'staging', '/x')
    const call = calls[0]
    const previewIdx = call.args.indexOf('preview')
    assert.equal(call.args[previewIdx + 1], '""', 'empty gitbranch not normalized to ""')
  })

  it('passes the value via stdin (never via --value) to avoid Windows shell escape', () => {
    const mongo =
      'mongodb+srv://user:pwd@cluster.mongodb.net/db?retryWrites=true&w=majority&appName=Cluster0'
    lib.vercelEnvAdd('MONGO_URL', mongo, 'staging', '/x')
    const call = calls[0]
    // CRITICAL: the raw value must go through stdin so cmd.exe doesn't
    // interpret `&` as a command separator.
    assert.equal(call.input, mongo)
    assert.ok(
      !call.args.includes('--value'),
      '--value flag present — re-introduces Windows shell escape bug'
    )
    // And the value must NEVER leak into argv (cmd.exe would shatter it at `&`)
    assert.ok(
      !call.args.some(a => a.includes('&')),
      `ampersand leaked into argv: ${JSON.stringify(call.args)}`
    )
  })

  it('includes --force so existing vars get overwritten', () => {
    lib.vercelEnvAdd('K', 'v', 'staging', '/x')
    assert.ok(calls[0].args.includes('--force'), '--force missing — would fail on re-push')
  })

  it('preserves special chars (& | $ %) untouched in the stdin payload', () => {
    const value = 'https://host/path?a=1&b=2&c=x|y$z%w'
    lib.vercelEnvAdd('URL', value, 'production', '/x')
    const call = calls[0]
    assert.equal(call.input, value)
  })
})

describe('vercelEnvRm — scope propagation', () => {
  beforeEach(async () => {
    installMock()
    await loadLib()
    process.env.VERCEL_SCOPE = 'ezstart'
  })
  afterEach(() => {
    restoreMock()
    delete process.env.VERCEL_SCOPE
  })

  it('appends --scope when VERCEL_SCOPE is set', () => {
    lib.vercelEnvRm('STALE', 'staging', '/x')
    const call = calls[0]
    const scopeIdx = call.args.indexOf('--scope')
    assert.ok(scopeIdx >= 0, '--scope missing')
    assert.equal(call.args[scopeIdx + 1], 'ezstart')
  })
})

// ──────────────────────────────────────────────────────────────
// execCapture — error surface
// ──────────────────────────────────────────────────────────────

describe('execCapture — stderr + status are surfaced', () => {
  beforeEach(async () => {
    installMock(() =>
      fakeResult({
        status: 2,
        stdout: Buffer.from('out\n'),
        stderr: Buffer.from('boom\n'),
      })
    )
    await loadLib()
  })
  afterEach(() => {
    restoreMock()
  })

  it('returns stderr + status alongside ok=false', () => {
    const res = lib.execCapture('x', ['y'])
    assert.equal(res.ok, false)
    assert.equal(res.status, 2)
    assert.ok(res.stderr.includes('boom'))
    assert.ok(res.stdout.includes('out'))
  })
})
