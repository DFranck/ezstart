// Types mirror api-ezstart E2E-MATRIX-001 DTOs.

import type { BadgeProps } from '@ezstart/ui/components'

export type TestStatus = 'pass' | 'fail' | 'blocked' | 'skip' | 'never'

export interface TestRun {
  status: Exclude<TestStatus, 'never'>
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
}

export interface TestHistoryResponse {
  definition: TestDefinition
  runs: TestRun[]
  stats: { passRate: number; avgDurationMs: number }
}

export interface NeedsRerunResponse {
  tests: TestDefinition[]
}

export interface AppStatsBucket {
  total: number
  pass: number
  fail: number
  blocked: number
  skip: number
}

export interface SummaryStatsResponse {
  total: number
  pass: number
  fail: number
  blocked: number
  skip: number
  byApp: Record<string, AppStatsBucket>
}

export type FreshnessBucket = 'all' | 'fresh-24h' | 'fresh-7d' | 'fresh-30d' | 'stale-30d' | 'never'

export const STATUS_VARIANT: Record<TestStatus, BadgeProps['variant']> = {
  pass: 'success',
  fail: 'destructive',
  blocked: 'warning',
  skip: 'secondary',
  never: 'outline',
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
