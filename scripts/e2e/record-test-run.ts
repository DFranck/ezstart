/**
 * E2E test run recorder CLI.
 *
 * POSTs a single E2E test run to the EZStart API. Designed to be invoked from
 * an MCP agent, a curl smoke loop, or a CI pipeline.
 *
 * Usage:
 *   pnpm e2e:record \
 *     --testId="ezauth.login.email-password" \
 *     --status=pass \
 *     --env=local \
 *     --tier=browser-e2e \
 *     --agent=mcp-chrome-devtools \
 *     --duration=2500 \
 *     --notes="Verified post #190 fix"
 *
 * `--env` is REQUIRED — pass `local`, `staging`, or `production`. Defaulting
 * silently to one of those would poison the matrix (a `local` fix recorded as
 * `production` would falsely turn the matrix green).
 *
 * `--tier` is REQUIRED at the API level (Zod). The CLI auto-derives a sensible
 * default from `--agent` when omitted, but logs a warn so callers know they're
 * relying on inference:
 *   curl, http                          → smoke
 *   mcp-chrome-devtools, playwright,    → browser-e2e
 *     cypress
 *   vitest, jest, ci-vitest             → unit
 *   anything else                       → browser-e2e (logged warn)
 *
 * Auth:
 *   Reads superadmin JWT from `EZSTART_SUPERADMIN_TOKEN` env var, or accepts
 *   `--token=<jwt>` as a flag. Without it the API returns 401.
 *
 * Endpoint:
 *   Defaults to http://localhost:6100 in dev. Override with `--api=` or env
 *   var `EZSTART_API_URL`.
 */

const VALID_ENVS = ['local', 'staging', 'production'] as const
type RunEnv = (typeof VALID_ENVS)[number]

const VALID_TIERS = ['smoke', 'browser-e2e', 'unit'] as const
type RunTier = (typeof VALID_TIERS)[number]

/**
 * Best-effort tier inference from the agent string. Returns `null` when the
 * agent is unrecognised, leaving the caller to fall back to a default with a
 * warning.
 *
 * Exported for testability from outside (e.g. CI wrappers that want to compute
 * the tier deterministically before posting).
 */
export function deriveTierFromAgent(agent: string): RunTier | null {
  const a = agent.toLowerCase()
  if (a === 'curl' || a === 'http') return 'smoke'
  if (a === 'mcp-chrome-devtools' || a === 'playwright' || a === 'cypress') return 'browser-e2e'
  if (a === 'vitest' || a === 'jest' || a === 'ci-vitest') return 'unit'
  return null
}

interface CliArgs {
  testId: string
  status: 'pass' | 'fail' | 'skip' | 'blocked'
  env: RunEnv
  tier: RunTier
  agent: string
  agentVersion?: string
  durationMs?: number
  notes?: string
  errors?: string[]
  triggeredBy?: string
  fileSnapshotSha?: string
  api: string
  token?: string
}

function parseArgs(argv: string[]): CliArgs {
  const map = new Map<string, string>()
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue
    const eq = raw.indexOf('=')
    if (eq === -1) {
      map.set(raw.slice(2), 'true')
    } else {
      map.set(raw.slice(2, eq), raw.slice(eq + 1))
    }
  }

  const testId = map.get('testId')
  const status = map.get('status') as CliArgs['status'] | undefined
  const agent = map.get('agent')
  const env = map.get('env') as RunEnv | undefined
  const rawTier = map.get('tier') as RunTier | undefined

  if (!testId) throw new Error('Missing --testId')
  if (!status || !['pass', 'fail', 'skip', 'blocked'].includes(status)) {
    throw new Error('Missing or invalid --status (must be pass | fail | skip | blocked)')
  }
  if (!agent) throw new Error('Missing --agent')
  if (!env || !VALID_ENVS.includes(env)) {
    throw new Error(
      `Missing or invalid --env (must be ${VALID_ENVS.join(' | ')}) — required since E2E-MATRIX-ENV-DIMENSION-001`
    )
  }

  // Tier resolution: explicit --tier wins; otherwise infer from agent and warn
  // when we fall back to the default. Required by the API since
  // E2E-MATRIX-TIER-DIMENSION-001 — the CLI never lets the request leave with
  // an unset tier (the API would reject with 422 Zod).
  let tier: RunTier
  if (rawTier !== undefined) {
    if (!VALID_TIERS.includes(rawTier)) {
      throw new Error(`Invalid --tier (must be ${VALID_TIERS.join(' | ')})`)
    }
    tier = rawTier
  } else {
    const inferred = deriveTierFromAgent(agent)
    if (inferred) {
      console.warn(
        `[e2e:record] --tier not provided, inferred '${inferred}' from agent='${agent}'. Pass --tier explicitly to silence.`
      )
      tier = inferred
    } else {
      console.warn(
        `[e2e:record] --tier not provided and agent='${agent}' is unknown — defaulting to 'browser-e2e'. Pass --tier explicitly.`
      )
      tier = 'browser-e2e'
    }
  }

  const durationRaw = map.get('duration') ?? map.get('durationMs')
  const durationMs = durationRaw !== undefined ? Number.parseInt(durationRaw, 10) : undefined
  if (durationMs !== undefined && Number.isNaN(durationMs)) {
    throw new Error('--duration must be an integer (ms)')
  }

  const errorsRaw = map.get('errors')
  const errors = errorsRaw
    ? errorsRaw
        .split('||')
        .map(s => s.trim())
        .filter(Boolean)
    : undefined

  return {
    testId,
    status,
    env,
    tier,
    agent,
    agentVersion: map.get('agentVersion'),
    durationMs,
    notes: map.get('notes'),
    errors,
    triggeredBy: map.get('triggeredBy'),
    fileSnapshotSha: map.get('fileSnapshotSha'),
    api: map.get('api') ?? process.env.EZSTART_API_URL ?? 'http://localhost:6100',
    token: map.get('token') ?? process.env.EZSTART_SUPERADMIN_TOKEN,
  }
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface RecordedRun {
  id: string
  testId: string
  status: string
  env: string
  tier: string
  runAt: string
  agent: string
}

async function postRun(args: CliArgs): Promise<RecordedRun> {
  const url = `${args.api.replace(/\/+$/, '')}/api/e2e-tests/runs`
  const body = {
    testId: args.testId,
    status: args.status,
    env: args.env,
    tier: args.tier,
    agent: args.agent,
    agentVersion: args.agentVersion,
    durationMs: args.durationMs,
    notes: args.notes,
    errors: args.errors,
    triggeredBy: args.triggeredBy,
    fileSnapshotSha: args.fileSnapshotSha,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (args.token) headers.Authorization = `Bearer ${args.token}`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as ApiEnvelope<RecordedRun>
  if (!res.ok || !json.success || !json.data) {
    throw new Error(`API ${res.status}: ${json.error ?? 'unknown error'}`)
  }
  return json.data
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const recorded = await postRun(args)

  const dashboardUrl = `${args.api.replace(/\/+$/, '')}/api/e2e-tests/${encodeURIComponent(recorded.testId)}`

  console.info('')
  console.info('✅ E2E test run recorded')
  console.info(`   Run ID:  ${recorded.id}`)
  console.info(`   Test:    ${recorded.testId}`)
  console.info(`   Status:  ${recorded.status}`)
  console.info(`   Env:     ${recorded.env}`)
  console.info(`   Tier:    ${recorded.tier}`)
  console.info(`   Agent:   ${recorded.agent}`)
  console.info(`   At:      ${recorded.runAt}`)
  console.info(`   View:    ${dashboardUrl}`)
  console.info('')
}

// Only run when invoked as a script — this file also exports
// `deriveTierFromAgent` which is consumed by tests / wrappers.
const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  const entryUrl = new URL(`file://${entry.replace(/\\/g, '/')}`).href
  return entryUrl === import.meta.url
})()

if (invokedAsScript) {
  main().catch(err => {
    console.error('record-test-run failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
