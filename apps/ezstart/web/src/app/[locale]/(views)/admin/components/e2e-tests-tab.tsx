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
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
  Switch,
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
  freshnessOf,
  getRunStatus,
  type EnvFilter,
  type FreshnessBucket,
  type NeedsRerunResponse,
  type SummaryStatsResponse,
  type TestDefinition,
  type TestsListResponse,
  type TierFilter,
} from './e2e-tests-types'

// ─── Fetchers ────────────────────────────────────────────────────────────

function buildMatrixQs(env: EnvFilter, tier: TierFilter): string {
  const params: string[] = []
  if (env !== 'all') params.push(`env=${encodeURIComponent(env)}`)
  if (tier !== 'all') params.push(`tier=${encodeURIComponent(tier)}`)
  return params.length === 0 ? '' : `?${params.join('&')}`
}

async function fetchTests(env: EnvFilter, tier: TierFilter): Promise<TestsListResponse> {
  return apiCall<TestsListResponse>(`/e2e-tests${buildMatrixQs(env, tier)}`, {
    appName: 'ezstart',
  })
}

async function fetchSummary(): Promise<SummaryStatsResponse> {
  return apiCall<SummaryStatsResponse>('/e2e-tests/stats/summary', { appName: 'ezstart' })
}

async function fetchNeedsRerun(env: EnvFilter, tier: TierFilter): Promise<NeedsRerunResponse> {
  return apiCall<NeedsRerunResponse>(`/e2e-tests/needs-rerun${buildMatrixQs(env, tier)}`, {
    appName: 'ezstart',
  })
}

// ─── Component ───────────────────────────────────────────────────────────

export function E2ETestsTab() {
  const t = useTranslations('admin.e2eTests')

  // Filters
  const [appFilter, setAppFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [envFilter, setEnvFilter] = useState<EnvFilter>('all')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [freshnessFilter, setFreshnessFilter] = useState<FreshnessBucket>('all')
  const [needsRerunOnly, setNeedsRerunOnly] = useState(false)

  // Drawer
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  // Queries — env + tier filters are server-side so the matrix recomputes
  // "latest run" per (env, tier) combination (a test that passes locally
  // browser-e2e but never ran as smoke in production should appear as
  // 'never' when filtering on production+smoke).
  const {
    data: testsData,
    isLoading: testsLoading,
    error: testsError,
  } = useQuery({
    queryKey: ['admin-e2e-tests', envFilter, tierFilter],
    queryFn: () => fetchTests(envFilter, tierFilter),
    staleTime: 30 * 1000,
  })

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-e2e-tests-summary'],
    queryFn: fetchSummary,
    staleTime: 30 * 1000,
  })

  const { data: needsRerunData } = useQuery({
    queryKey: ['admin-e2e-tests-needs-rerun', envFilter, tierFilter],
    queryFn: () => fetchNeedsRerun(envFilter, tierFilter),
    staleTime: 30 * 1000,
  })

  // Derived
  const allApps = useMemo(() => {
    const set = new Set<string>()
    testsData?.tests.forEach(test => set.add(test.app))
    return Array.from(set).sort()
  }, [testsData])

  const needsRerunIds = useMemo(
    () => new Set((needsRerunData?.tests ?? []).map(test => test.testId)),
    [needsRerunData]
  )

  const filteredTests = useMemo(() => {
    if (!testsData) return []
    return testsData.tests.filter(test => {
      if (appFilter !== 'all' && test.app !== appFilter) return false
      if (statusFilter !== 'all' && getRunStatus(test) !== statusFilter) return false
      if (freshnessFilter !== 'all' && freshnessOf(test) !== freshnessFilter) return false
      if (needsRerunOnly && !needsRerunIds.has(test.testId)) return false
      return true
    })
  }, [testsData, appFilter, statusFilter, freshnessFilter, needsRerunOnly, needsRerunIds])

  // Relative time labels (built from i18n)
  const relativeLabels = {
    never: t('lastRun.never'),
    minutes: t('lastRun.minutesAgo'),
    hours: t('lastRun.hoursAgo'),
    days: t('lastRun.daysAgo'),
  }

  // Columns
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
      id: 'env',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t('columns.env')} />,
      cell: ({ row }) => (
        <EnvBadge
          env={row.original.lastRun?.env}
          tooltip={
            row.original.lastRun?.env
              ? t(`env.${row.original.lastRun.env}`)
              : t('env.envBadge.tooltip')
          }
        />
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
      id: 'agent',
      header: t('columns.agent'),
      cell: ({ row }) => (
        <Span className="text-xs text-muted-foreground">{row.original.lastRun?.agent ?? '—'}</Span>
      ),
    },
    {
      id: 'actions',
      header: t('columns.actions'),
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedTestId(row.original.testId)}>
          {t('actions.viewHistory')}
        </Button>
      ),
    },
  ]

  // Stats display values — the API returns the canonical
  // `{ totalDefinitions, latestRunBreakdown: { pass, fail, ... }, passRate }`
  // shape (FIX-EZSTART-ADMIN-UI-PASS-001). The previous flat reads
  // (`summaryData.total`, `summaryData.pass`) silently produced 0 because the
  // TS contract was wrong.
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

      {/* Stats */}
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

      {/* Per-env breakdown — surfaces the env dimension at a glance */}
      {summaryData?.byEnv && (
        <Div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RUN_ENVS.map(env => {
            const bucket = summaryData.byEnv?.[env]
            const passes = bucket?.pass ?? 0
            return (
              <Card key={env} className="p-4">
                <Div className="flex items-center gap-2">
                  <EnvBadge env={env} tooltip={t(`env.${env}`)} size="sm" />
                  <P className="text-xs text-muted-foreground">{t('stats.envPassLabel')}</P>
                </Div>
                <P className="text-2xl font-semibold mt-2 tabular-nums">
                  {passes}
                  <Span className="ml-1 text-sm font-normal text-muted-foreground">/ {total}</Span>
                </P>
                <P className="text-xs text-muted-foreground mt-1">
                  {t('stats.envBreakdown', {
                    fail: bucket?.fail ?? 0,
                    blocked: bucket?.blocked ?? 0,
                    never: bucket?.never ?? 0,
                  })}
                </P>
              </Card>
            )
          })}
        </Div>
      )}

      {/* Per-tier breakdown — surfaces what was actually exercised */}
      {summaryData?.byTier && (
        <Div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RUN_TIERS.map(tier => {
            const bucket = summaryData.byTier?.[tier]
            const passes = bucket?.pass ?? 0
            const tierKey = tier === 'browser-e2e' ? 'browserE2E' : tier
            return (
              <Card key={tier} className="p-4">
                <Div className="flex items-center gap-2">
                  <TierBadge tier={tier} tooltip={t(`tier.${tierKey}`)} size="sm" />
                  <P className="text-xs text-muted-foreground">{t('stats.tierPassLabel')}</P>
                </Div>
                <P className="text-2xl font-semibold mt-2 tabular-nums">
                  {passes}
                  <Span className="ml-1 text-sm font-normal text-muted-foreground">/ {total}</Span>
                </P>
                <P className="text-xs text-muted-foreground mt-1">
                  {t('stats.tierBreakdown', {
                    fail: bucket?.fail ?? 0,
                    blocked: bucket?.blocked ?? 0,
                    never: bucket?.never ?? 0,
                  })}
                </P>
              </Card>
            )
          })}
        </Div>
      )}

      {/* Filters */}
      <Card variant="floating">
        <CardContent className="py-4 flex flex-wrap items-end gap-4">
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

          <Div className="space-y-1.5">
            <P className="text-xs font-medium text-muted-foreground">{t('filters.env')}</P>
            <Select value={envFilter} onValueChange={v => setEnvFilter(v as EnvFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('env.all')}</SelectItem>
                {RUN_ENVS.map(env => (
                  <SelectItem key={env} value={env}>
                    {t(`env.${env}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Div>

          <Div className="space-y-1.5">
            <P className="text-xs font-medium text-muted-foreground">{t('filters.tier')}</P>
            <Select value={tierFilter} onValueChange={v => setTierFilter(v as TierFilter)}>
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
            <P className="text-xs font-medium text-muted-foreground">{t('filters.freshness')}</P>
            <Select
              value={freshnessFilter}
              onValueChange={v => setFreshnessFilter(v as FreshnessBucket)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allFreshness')}</SelectItem>
                <SelectItem value="fresh-24h">{t('filters.fresh24h')}</SelectItem>
                <SelectItem value="fresh-7d">{t('filters.fresh7d')}</SelectItem>
                <SelectItem value="fresh-30d">{t('filters.fresh30d')}</SelectItem>
                <SelectItem value="stale-30d">{t('filters.stale30d')}</SelectItem>
                <SelectItem value="never">{t('filters.never')}</SelectItem>
              </SelectContent>
            </Select>
          </Div>

          <Div className="flex items-center gap-2 pb-2">
            <Switch
              id="needs-rerun-only"
              checked={needsRerunOnly}
              onCheckedChange={setNeedsRerunOnly}
            />
            <label htmlFor="needs-rerun-only" className="text-sm text-foreground">
              {t('filters.needsRerunOnly')}
            </label>
          </Div>
        </CardContent>
      </Card>

      {/* Table */}
      {testsError && (
        <Card variant="floating">
          <CardContent className="py-6">
            <P className="font-semibold text-destructive">{t('failedToLoad')}</P>
            <P className="text-sm text-muted-foreground mt-1">
              {testsError instanceof Error ? testsError.message : String(testsError)}
            </P>
          </CardContent>
        </Card>
      )}

      {testsLoading && !testsData && (
        <Div className="space-y-2">
          <Skeleton className="h-12 w-full" />
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

      <E2ETestsHistoryDrawer
        testId={selectedTestId}
        open={!!selectedTestId}
        onClose={() => setSelectedTestId(null)}
      />
    </Div>
  )
}
