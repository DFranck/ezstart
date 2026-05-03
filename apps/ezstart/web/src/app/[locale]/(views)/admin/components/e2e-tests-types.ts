// Types mirror api-ezstart E2E-MATRIX-001 + E2E-MATRIX-ENV-DIMENSION-001 DTOs.

import type { BadgeProps } from '@ezstart/ui/components'

export type TestStatus = 'pass' | 'fail' | 'blocked' | 'skip' | 'never'

/**
 * Environment in which a test run was executed.
 *
 * Mirrors `E2E_RUN_ENVS` from api-ezstart. `'all'` is a UI-only sentinel used
 * by the env filter dropdown — never sent to the server as a stored value.
 */
export type RunEnv = 'local' | 'staging' | 'production'
export type EnvFilter = RunEnv | 'all'

export const RUN_ENVS: readonly RunEnv[] = ['local', 'staging', 'production'] as const

/**
 * Tier of a test run. Mirrors `E2E_RUN_TIERS` from api-ezstart.
 *
 * - `smoke`        → curl HTTP code check (real backend, no UI flow)
 * - `browser-e2e`  → full browser automation (form fill, click, redirect, console)
 * - `unit`         → vitest/jest in-process (no HTTP, no browser)
 */
export type RunTier = 'smoke' | 'browser-e2e' | 'unit'
export type TierFilter = RunTier | 'all'

export const RUN_TIERS: readonly RunTier[] = ['smoke', 'browser-e2e', 'unit'] as const

export interface TestRun {
  status: Exclude<TestStatus, 'never'>
  /** Optional for backwards-compat — pre-migration runs may lack env client-side. */
  env?: RunEnv
  /** Optional for backwards-compat — pre-migration runs may lack tier client-side. */
  tier?: RunTier
  runAt: string
  agent: string
  durationMs?: number
  errors?: string[]
  notes?: string
}

export interface TestDefinition {
  testId: string
  app: string
  feature: string
  description?: string
  exercises?: string[]
  lastRun?: TestRun
}

export interface TestsListResponse {
  tests: TestDefinition[]
  total: number
  env?: EnvFilter
  tier?: TierFilter
}

export interface EnvStatsBucket {
  total: number
  pass: number
  fail: number
  blocked: number
  skip: number
  passRate: number | null
  avgDurationMs?: number | null
  lastRunAt?: string | null
}

export interface TestHistoryResponse {
  definition: TestDefinition
  runs: TestRun[]
  stats: {
    passRate: number
    avgDurationMs: number
    /** Per-env breakdown — undefined on legacy responses, drives drawer tabs. */
    byEnv?: Record<RunEnv, EnvStatsBucket>
    /** Per-tier breakdown — undefined on legacy responses, drives drawer tier tabs. */
    byTier?: Record<RunTier, EnvStatsBucket>
  }
}

export interface NeedsRerunResponse {
  tests: TestDefinition[]
  env?: EnvFilter
  tier?: TierFilter
}

export interface AppStatsBucket {
  app: string
  totalDefinitions: number
  pass: number
  fail: number
  blocked: number
  skip: number
  never: number
}

export interface EnvSummaryBucket {
  pass: number
  fail: number
  blocked: number
  skip: number
  never: number
}

/**
 * Latest-run breakdown shape returned by `GET /api/e2e-tests/stats/summary`.
 *
 * Mirrors the api-ezstart `E2E-MATRIX-001` controller output. The previous TS
 * contract declared a flat `{ total, pass, fail, ... }` shape that the API
 * never returned, which caused the admin Stats cards to display 0/0%/0
 * (FIX-EZSTART-ADMIN-UI-PASS-001).
 */
export interface SummaryStatsResponse {
  totalDefinitions: number
  latestRunBreakdown: EnvSummaryBucket
  /** Pre-computed pass rate as a percentage (0–100, 1 decimal). */
  passRate: number
  byApp: AppStatsBucket[]
  /** Per-env latest-run breakdown. Optional for backwards-compat. */
  byEnv?: Record<RunEnv, EnvSummaryBucket>
  /** Per-tier latest-run breakdown. Optional for backwards-compat. */
  byTier?: Record<RunTier, EnvSummaryBucket>
  lastRunAt?: string
  evaluatedAt?: string
}

export type FreshnessBucket = 'all' | 'fresh-24h' | 'fresh-7d' | 'fresh-30d' | 'stale-30d' | 'never'

export const STATUS_VARIANT: Record<TestStatus, BadgeProps['variant']> = {
  pass: 'success',
  fail: 'destructive',
  blocked: 'warning',
  skip: 'secondary',
  never: 'outline',
}

/**
 * Badge color per env. Mission spec: local=blue, staging=yellow, production=green.
 * (Maps to existing variants — no new variant added to packages/ui.)
 */
export const ENV_VARIANT: Record<RunEnv, BadgeProps['variant']> = {
  local: 'info',
  staging: 'warning',
  production: 'success',
}

/**
 * Badge color per tier. Mission spec: smoke=cyan, browser-e2e=purple, unit=gray.
 * (Maps to existing variants — no new variant added to packages/ui.)
 */
export const TIER_VARIANT: Record<RunTier, BadgeProps['variant']> = {
  smoke: 'cyan',
  'browser-e2e': 'purple',
  unit: 'secondary',
}

// ─── Helpers ─────────────────────────────────────────────────────────────

export function getRunStatus(test: TestDefinition): TestStatus {
  return test.lastRun?.status ?? 'never'
}

function ageHours(iso?: string): number {
  if (!iso) return Number.POSITIVE_INFINITY
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

export function freshnessOf(test: TestDefinition): FreshnessBucket {
  const h = ageHours(test.lastRun?.runAt)
  if (!Number.isFinite(h)) return 'never'
  if (h < 24) return 'fresh-24h'
  if (h < 24 * 7) return 'fresh-7d'
  if (h < 24 * 30) return 'fresh-30d'
  return 'stale-30d'
}

export function formatRelativeTime(
  iso?: string,
  labels?: { never: string; minutes: string; hours: string; days: string }
): string {
  if (!iso || !labels) return labels?.never ?? '—'
  const minutes = (Date.now() - new Date(iso).getTime()) / 60000
  if (minutes < 60)
    return labels.minutes.replace('{count}', String(Math.max(1, Math.round(minutes))))
  const hours = minutes / 60
  if (hours < 48) return labels.hours.replace('{count}', String(Math.round(hours)))
  const days = hours / 24
  return labels.days.replace('{count}', String(Math.round(days)))
}

export function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}
