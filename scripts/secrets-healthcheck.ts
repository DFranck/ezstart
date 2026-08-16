#!/usr/bin/env tsx
/**
 * Healthcheck every API in the monorepo by hitting `/api/health`.
 *
 * URLs come from `@ezstart/config` (`getApiUrl(app, env)`) — the mapping is
 * the single source of truth, so adding a new API automatically shows up here.
 *
 * Usage:
 *   pnpm secrets:healthcheck                        # all services, production
 *   pnpm secrets:healthcheck --env local
 *   pnpm secrets:healthcheck --service ezbill-api   # one service
 *   pnpm secrets:healthcheck --all                  # explicit (default)
 *   pnpm secrets:healthcheck --json
 *   pnpm secrets:healthcheck --timeout 15000
 *
 * Exit code: 0 when every checked service is healthy, otherwise the number
 * of failures (capped at 125 so shells don't barf).
 */

import { getApiUrl, hasApi, type AppName, type Environment } from '@ezstart/config'
import { allAppNames, railwayTargetForApp, say } from './lib/secrets-cli.js'

type CheckFlags = {
  env: Environment
  service: string | null
  all: boolean
  json: boolean
  timeoutMs: number
}

function parseCheckFlags(argv: readonly string[]): CheckFlags {
  const has = (name: string): boolean => argv.includes(name)
  const valueOf = (name: string): string | null => {
    const idx = argv.indexOf(name)
    if (idx < 0 || idx + 1 >= argv.length) return null
    return argv[idx + 1] ?? null
  }

  const rawEnv = valueOf('--env') ?? 'production'
  const validEnvs: readonly Environment[] = ['local', 'development', 'staging', 'production']
  if (!validEnvs.includes(rawEnv as Environment)) {
    throw new Error(`Invalid --env "${rawEnv}". Expected one of ${validEnvs.join('|')}.`)
  }

  const timeoutRaw = valueOf('--timeout')
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : 10_000
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid --timeout "${timeoutRaw}"`)
  }

  return {
    env: rawEnv as Environment,
    service: valueOf('--service'),
    all: has('--all'),
    json: has('--json'),
    timeoutMs,
  }
}

type HealthResult = {
  app: AppName
  service: string
  url: string
  ok: boolean
  status: number | null
  latencyMs: number
  error?: string
  body?: unknown
}

async function check(app: AppName, flags: CheckFlags): Promise<HealthResult> {
  const rw = railwayTargetForApp(app)
  const service = rw?.service ?? `${app}-api`
  const base = getApiUrl(app, flags.env)
  const url = `${base.replace(/\/$/, '')}/api/health`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), flags.timeoutMs)
  const started = Date.now()
  try {
    const res = await fetch(url, { signal: controller.signal })
    const latencyMs = Date.now() - started
    let body: unknown = undefined
    try {
      body = await res.json()
    } catch {
      /* body not JSON — ignore */
    }
    return {
      app,
      service,
      url,
      ok: res.ok,
      status: res.status,
      latencyMs,
      body,
    }
  } catch (err) {
    const latencyMs = Date.now() - started
    const msg = err instanceof Error ? err.message : String(err)
    return {
      app,
      service,
      url,
      ok: false,
      status: null,
      latencyMs,
      error: msg,
    }
  } finally {
    clearTimeout(timer)
  }
}

function formatBodyPreview(body: unknown): string {
  if (body === undefined || body === null) return ''
  if (typeof body !== 'object') return String(body)
  const o = body as Record<string, unknown>
  const parts: string[] = []
  if ('db' in o && o.db) parts.push(`db: ${String(o.db)}`)
  if ('mongo' in o && o.mongo) parts.push(`mongo: ${String(o.mongo)}`)
  if ('uptime' in o && o.uptime !== undefined) {
    const up = Number(o.uptime)
    if (Number.isFinite(up)) {
      const h = Math.floor(up / 3600)
      const m = Math.floor((up % 3600) / 60)
      parts.push(`uptime: ${h}h${m}m`)
    }
  }
  if ('status' in o && typeof o.status === 'string') parts.push(`status: ${o.status}`)
  return parts.join(', ')
}

async function main(): Promise<void> {
  const flags = parseCheckFlags(process.argv.slice(2))

  const candidates: AppName[] = allAppNames().filter(app => hasApi(app))
  const targets = flags.service
    ? candidates.filter(app => {
        const rw = railwayTargetForApp(app)
        const service = rw?.service ?? `${app}-api`
        return service === flags.service || app === flags.service
      })
    : candidates

  if (targets.length === 0) {
    if (flags.json) {
      process.stdout.write(`${JSON.stringify({ results: [], failures: 1 }, null, 2)}\n`)
    } else {
      say(`\n[x] no API matched ${flags.service ?? '(all)'}\n`)
    }
    process.exit(1)
  }

  if (!flags.json) {
    say(`\n[healthcheck] env=${flags.env} timeout=${flags.timeoutMs}ms targets=${targets.length}\n`)
  }

  const results = await Promise.all(targets.map(app => check(app, flags)))

  if (flags.json) {
    const failures = results.filter(r => !r.ok).length
    process.stdout.write(`${JSON.stringify({ results, failures }, null, 2)}\n`)
    process.exit(Math.min(failures, 125))
    return
  }

  let maxServiceLen = 0
  let maxUrlLen = 0
  for (const r of results) {
    if (r.service.length > maxServiceLen) maxServiceLen = r.service.length
    if (r.url.length > maxUrlLen) maxUrlLen = r.url.length
  }

  let failures = 0
  for (const r of results) {
    const icon = r.ok ? '[ok]' : '[x] '
    const statusStr = r.status !== null ? `${r.status}` : 'ERR'
    const latency = `${r.latencyMs}ms`
    const preview = r.ok ? formatBodyPreview(r.body) : (r.error ?? '').split('\n')[0]
    say(
      `  ${icon} ${r.service.padEnd(maxServiceLen)}  ${r.url.padEnd(Math.min(maxUrlLen, 60))}  ${statusStr.padStart(3)} ${latency.padStart(7)}${preview ? '  (' + preview + ')' : ''}`
    )
    if (!r.ok) failures++
  }

  say('')
  if (failures === 0) {
    say(`[done] all ${results.length} service(s) healthy\n`)
    process.exit(0)
  } else {
    say(`[fail] ${failures}/${results.length} service(s) unhealthy\n`)
    process.exit(Math.min(failures, 125))
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[fatal] ${msg}\n`)
  process.exit(1)
})
