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
 *     --agent=mcp-chrome-devtools \
 *     --duration=2500 \
 *     --notes="Verified post #190 fix"
 *
 * Auth:
 *   Reads superadmin JWT from `EZSTART_SUPERADMIN_TOKEN` env var, or accepts
 *   `--token=<jwt>` as a flag. Without it the API returns 401.
 *
 * Endpoint:
 *   Defaults to http://localhost:6100 in dev. Override with `--api=` or env
 *   var `EZSTART_API_URL`.
 */

interface CliArgs {
  testId: string
  status: 'pass' | 'fail' | 'skip' | 'blocked'
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

  if (!testId) throw new Error('Missing --testId')
  if (!status || !['pass', 'fail', 'skip', 'blocked'].includes(status)) {
    throw new Error('Missing or invalid --status (must be pass | fail | skip | blocked)')
  }
  if (!agent) throw new Error('Missing --agent')

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
  runAt: string
  agent: string
}

async function postRun(args: CliArgs): Promise<RecordedRun> {
  const url = `${args.api.replace(/\/+$/, '')}/api/e2e-tests/runs`
  const body = {
    testId: args.testId,
    status: args.status,
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
  console.info(`   Agent:   ${recorded.agent}`)
  console.info(`   At:      ${recorded.runAt}`)
  console.info(`   View:    ${dashboardUrl}`)
  console.info('')
}

main().catch(err => {
  console.error('record-test-run failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
