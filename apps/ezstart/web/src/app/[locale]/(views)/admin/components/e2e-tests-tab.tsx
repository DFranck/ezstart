'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Div,
  H2,
  H3,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
  type ColumnDef,
} from '@ezstart/ui/components'
import { E2ETestsHistoryDrawer } from './e2e-tests-history-drawer'
import { EnvBadge } from './env-badge'
import { TierBadge } from './tier-badge'
import {
  RUN_ENVS,
  RUN_TIERS,
  STATUS_VARIANT,
  formatRelativeTime,
  getRunStatus,
  type EnvSummaryBucket,
  type NeedsRerunResponse,
  type RunEnv,
  type RunTier,
  type SummaryStatsResponse,
  type TestDefinition,
  type TestsListResponse,
} from './e2e-tests-types'

// ─── Fetchers ────────────────────────────────────────────────────────────

async function fetchTestsForEnv(env: RunEnv): Promise<TestsListResponse> {
  return apiCall<TestsListResponse>(`/e2e-tests?env=${encodeURIComponent(env)}&limit=200`, {
    appName: 'ezstart',
  })
}

async function fetchSummary(): Promise<SummaryStatsResponse> {
  return apiCall<SummaryStatsResponse>('/e2e-tests/stats/summary', { appName: 'ezstart' })
}

async function fetchNeedsRerun(): Promise<NeedsRerunResponse> {
  return apiCall<NeedsRerunResponse>('/e2e-tests/needs-rerun', {
    appName: 'ezstart',
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Best-effort fallback when the API doesn't return an env-level bucket.
 *
 * NOTE — summing tier buckets can double-count tests that ran in multiple tiers
 * within the same env (e.g. a test that ran both as smoke AND browser-e2e in
 * `staging` would be counted twice). The authoritative source is
 * `summaryData.byEnv[env]` which counts each (testId, env) latest-run exactly
 * once. This helper is only used when `byEnv` is missing on legacy responses.
 */
function aggregateEnvBucket(
  byTier: Record<RunTier, EnvSummaryBucket> | undefined
): EnvSummaryBucket {
  const sum: EnvSummaryBucket = { pass: 0, fail: 0, blocked: 0, skip: 0, never: 0 }
  if (!byTier) return sum
  for (const tier of RUN_TIERS) {
    const bucket = byTier[tier]
    if (!bucket) continue
    sum.pass += bucket.pass
    sum.fail += bucket.fail
    sum.blocked += bucket.blocked
    sum.skip += bucket.skip
  }
  return sum
}

// ─── Per-env panel ───────────────────────────────────────────────────────

interface EnvPanelProps {
  env: RunEnv
  totalDefinitions: number
  envBucket: EnvSummaryBucket | undefined
  envTierBuckets: Record<RunTier, EnvSummaryBucket> | undefined
  needsRerunIds: Set<string>
  onSelectTest: (testId: string) => void
}

function EnvPanel({
  env,
  totalDefinitions,
  envBucket,
  envTierBuckets,
  needsRerunIds,
  onSelectTest,
}: EnvPanelProps) {
  const t = useTranslations('admin.e2eTests')

  // Per-env filters (scoped per panel so each env table can be filtered independently)
  const [appFilter, setAppFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')

  // Per-env data fetch — server-side env scoping ensures "latest run in <env>"
  // (a test passing locally but never run in production correctly appears as
  // 'never' in the production panel).
  const {
    data: testsData,
    isLoading: testsLoading,
    error: testsError,
  } = useQuery({
    queryKey: ['admin-e2e-tests', env],
    queryFn: () => fetchTestsForEnv(env),
    staleTime: 30 * 1000,
  })

  const allApps = useMemo(() => {
    const set = new Set<string>()
    testsData?.tests.forEach(test => set.add(test.app))
    return Array.from(set).sort()
  }, [testsData])

  const filteredTests = useMemo(() => {
    if (!testsData) return []
    return testsData.tests.filter(test => {
      if (appFilter !== 'all' && test.app !== appFilter) return false
      if (statusFilter !== 'all' && getRunStatus(test) !== statusFilter) return false
      if (tierFilter !== 'all') {
        const runTier = test.lastRun?.tier
        // Show 'never' rows under the unit tier filter only when the unit tier
        // is explicitly selected — same logic for any tier (a test that never
        // ran shouldn't appear under a specific tier filter).
        if (runTier !== tierFilter) return false
      }
      return true
    })
  }, [testsData, appFilter, statusFilter, tierFilter])

  const relativeLabels = {
    never: t('lastRun.never'),
    minutes: t('lastRun.minutesAgo'),
    hours: t('lastRun.hoursAgo'),
    days: t('lastRun.daysAgo'),
  }

  const columns: ColumnDef<TestDefinition>[] = [
    {
      accessorKey: 'testId',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.testId')} />,
      cell: ({ row }) => (
        <Span className="text-xs font-mono text-muted-foreground">{row.original.testId}</Span>
      ),
    },
    {
      accessorKey: 'app',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.app')} />,
      cell: ({ row }) => (
        <Badge variant="outline" size="xs">
          {row.original.app}
        </Badge>
      ),
    },
    {
      accessorKey: 'category',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.category')} />
      ),
      cell: ({ row }) => (
        <Span className="text-xs text-muted-foreground">{row.original.category ?? '—'}</Span>
      ),
    },
    {
      accessorKey: 'feature',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.feature')} />
      ),
      cell: ({ row }) => (
        <Div className="space-y-1">
          <P className="text-sm font-medium">{row.original.feature}</P>
          {row.original.description && (
            <P className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</P>
          )}
        </Div>
      ),
    },
    {
      id: 'tier',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.tier')} />,
      cell: ({ row }) => (
        <TierBadge
          tier={row.original.lastRun?.tier}
          tooltip={
            row.original.lastRun?.tier
              ? t(
                  `tier.${row.original.lastRun.tier === 'browser-e2e' ? 'browserE2E' : row.original.lastRun.tier}`
                )
              : t('tier.tierBadge.tooltip')
          }
          label={
            row.original.lastRun?.tier
              ? t(
                  `tier.${row.original.lastRun.tier === 'browser-e2e' ? 'browserE2E' : row.original.lastRun.tier}`
                )
              : undefined
          }
        />
      ),
    },
    {
      id: 'status',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.status')} />,
      cell: ({ row }) => {
        const status = getRunStatus(row.original)
        const isStale = needsRerunIds.has(row.original.testId)
        return (
          <Div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[status]} size="sm" dot>
              {t(`status.${status}`)}
            </Badge>
            {isStale && (
              <Badge variant="warning" size="xs" title={t('needsRerun.tooltip')}>
                {t('needsRerun.badge')}
              </Badge>
            )}
          </Div>
        )
      },
    },
    {
      id: 'note',
      header: t('columns.note'),
      cell: ({ row }) => {
        const notes = row.original.lastRun?.notes
        const errors = row.original.lastRun?.errors
        const lastErr = errors && errors.length > 0 ? errors[0] : undefined
        const text = notes ?? lastErr ?? '—'
        return (
          <Span className="text-xs text-muted-foreground line-clamp-2" title={text}>
            {text}
          </Span>
        )
      },
    },
    {
      id: 'lastRun',
      header: ({ header }) => (
        <DataTableColumnHeader header={header} title={t('columns.lastRun')} />
      ),
      cell: ({ row }) => (
        <Span className="text-xs text-muted-foreground tabular-nums">
          {formatRelativeTime(row.original.lastRun?.runAt, relativeLabels)}
        </Span>
      ),
    },
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => onSelectTest(row.original.testId)}>
          {t('actions.viewHistory')}
        </Button>
      ),
    },
  ]

  // Aggregate counts for this env — prefer authoritative `byEnv` bucket;
  // fall back to summing the tier buckets if `byEnv` is absent.
  const aggregate = envBucket ?? aggregateEnvBucket(envTierBuckets)
  const passCount = aggregate.pass
  const failCount = aggregate.fail
  const blockedCount = aggregate.blocked
  const neverCount = aggregate.never

  return (
    <Card variant="floating" className="overflow-hidden">
      <CardContent className="p-0">
        {/* Env header */}
        <Div className="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-6 py-4">
          <Div className="flex items-center gap-3">
            <EnvBadge env={env} tooltip={t(`env.${env}`)} size="default" />
            <H3 className="text-base font-semibold">{t(`env.${env}`)}</H3>
          </Div>
          <Div className="flex flex-wrap items-center gap-3 text-sm">
            <Span className="tabular-nums">
              <Span className="font-semibold text-success">{passCount}</Span>
              <Span className="text-muted-foreground">/{totalDefinitions} </Span>
              <Span className="text-muted-foreground">{t('panel.passing')}</Span>
            </Span>
            <Span className="text-muted-foreground">·</Span>
            <Span className="tabular-nums text-destructive">
              {failCount} {t('status.fail')}
            </Span>
            <Span className="text-muted-foreground">·</Span>
            <Span className="tabular-nums text-warning">
              {blockedCount} {t('status.blocked')}
            </Span>
            <Span className="text-muted-foreground">·</Span>
            <Span className="tabular-nums text-muted-foreground">
              {neverCount} {t('status.never')}
            </Span>
          </Div>
        </Div>

        {/* Tier breakdown */}
        <Div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-4 border-b border-border">
          {RUN_TIERS.map(tier => {
            const bucket = envTierBuckets?.[tier]
            const tierKey = tier === 'browser-e2e' ? 'browserE2E' : tier
            const tierPass = bucket?.pass ?? 0
            const tierTotal =
              (bucket?.pass ?? 0) +
              (bucket?.fail ?? 0) +
              (bucket?.blocked ?? 0) +
              (bucket?.skip ?? 0) +
              (bucket?.never ?? 0)
            return (
              <Div key={tier} className="flex items-center justify-between gap-2">
                <Div className="flex items-center gap-2">
                  <TierBadge tier={tier} tooltip={t(`tier.${tierKey}`)} size="sm" />
                </Div>
                <P className="text-sm tabular-nums">
                  <Span className="font-semibold">{tierPass}</Span>
                  <Span className="text-muted-foreground">
                    /{tierTotal} {t('panel.passing')}
                  </Span>
                </P>
              </Div>
            )
          })}
        </Div>

        {/* Filters */}
        <Div className="flex flex-wrap items-end gap-3 px-6 py-4 border-b border-border">
          <Div className="space-y-1.5">
            <P className="text-xs font-medium text-muted-foreground">{t('filters.app')}</P>
            <Select value={appFilter} onValueChange={setAppFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allApps')}</SelectItem>
                {allApps.map(app => (
                  <SelectItem key={app} value={app}>
                    {app}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Div>

          <Div className="space-y-1.5">
            <P className="text-xs font-medium text-muted-foreground">{t('filters.tier')}</P>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tier.all')}</SelectItem>
                {RUN_TIERS.map(tier => (
                  <SelectItem key={tier} value={tier}>
                    {t(`tier.${tier === 'browser-e2e' ? 'browserE2E' : tier}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Div>

          <Div className="space-y-1.5">
            <P className="text-xs font-medium text-muted-foreground">{t('filters.status')}</P>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                <SelectItem value="pass">{t('status.pass')}</SelectItem>
                <SelectItem value="fail">{t('status.fail')}</SelectItem>
                <SelectItem value="blocked">{t('status.blocked')}</SelectItem>
                <SelectItem value="skip">{t('status.skip')}</SelectItem>
                <SelectItem value="never">{t('status.never')}</SelectItem>
              </SelectContent>
            </Select>
          </Div>
        </Div>

        {/* Table */}
        <Div className="px-6 py-4">
          {testsError && (
            <Div className="py-6">
              <P className="font-semibold text-destructive">{t('failedToLoad')}</P>
              <P className="text-sm text-muted-foreground mt-1">
                {testsError instanceof Error ? testsError.message : String(testsError)}
              </P>
            </Div>
          )}

          {testsLoading && !testsData && (
            <Div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </Div>
          )}

          {testsData && (
            <DataTable
              columns={columns}
              data={filteredTests}
              pageSize={20}
              texts={{
                rows: t('table.rows'),
                previous: t('table.previous'),
                next: t('table.next'),
                pageOf: t('table.pageOf'),
                empty: t('table.empty'),
              }}
            />
          )}
        </Div>
      </CardContent>
    </Card>
  )
}

// ─── Component ───────────────────────────────────────────────────────────

export function E2ETestsTab() {
  const t = useTranslations('admin.e2eTests')

  // Drawer
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-e2e-tests-summary'],
    queryFn: fetchSummary,
    staleTime: 30 * 1000,
  })

  const { data: needsRerunData } = useQuery({
    queryKey: ['admin-e2e-tests-needs-rerun'],
    queryFn: fetchNeedsRerun,
    staleTime: 30 * 1000,
  })

  const needsRerunIds = useMemo(
    () => new Set((needsRerunData?.tests ?? []).map(test => test.testId)),
    [needsRerunData]
  )

  // Top-line stats (env-agnostic — kept for at-a-glance health)
  const total = summaryData?.totalDefinitions ?? 0
  const failCount = summaryData?.latestRunBreakdown?.fail ?? 0
  const passRate = summaryData?.passRate ?? 0
  const needsRerunCount = needsRerunData?.tests.length ?? 0

  return (
    <Div className="mt-4 space-y-6">
      {/* Header */}
      <Div>
        <H2 size="h3">{t('title')}</H2>
        <P className="text-sm text-muted-foreground mt-1">{t('subtitle')}</P>
      </Div>

      {/* Top-line stats */}
      <Div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        ) : (
          <>
            <Card className="p-4">
              <P className="text-xs text-muted-foreground">{t('stats.totalLabel')}</P>
              <P className="text-2xl font-semibold mt-1 tabular-nums">{total}</P>
            </Card>
            <Card className="p-4">
              <P className="text-xs text-muted-foreground">{t('stats.passRateLabel')}</P>
              <P className="text-2xl font-semibold mt-1 tabular-nums text-success">
                {passRate.toFixed(1)}%
              </P>
            </Card>
            <Card className="p-4">
              <P className="text-xs text-muted-foreground">{t('stats.failingLabel')}</P>
              <P className="text-2xl font-semibold mt-1 tabular-nums text-destructive">
                {failCount}
              </P>
            </Card>
            <Card className="p-4">
              <P className="text-xs text-muted-foreground">{t('stats.needsRerunLabel')}</P>
              <P className="text-2xl font-semibold mt-1 tabular-nums text-warning">
                {needsRerunCount}
              </P>
            </Card>
          </>
        )}
      </Div>

      {/* Per-env stacked panels — env on top, tier nested as sub-breakdown */}
      <Div className="space-y-6">
        {RUN_ENVS.map(env => (
          <EnvPanel
            key={env}
            env={env}
            totalDefinitions={total}
            envBucket={summaryData?.byEnv?.[env]}
            envTierBuckets={summaryData?.byEnvTier?.[env]}
            needsRerunIds={needsRerunIds}
            onSelectTest={setSelectedTestId}
          />
        ))}
      </Div>

      <E2ETestsHistoryDrawer
        testId={selectedTestId}
        open={!!selectedTestId}
        onClose={() => setSelectedTestId(null)}
      />
    </Div>
  )
}
