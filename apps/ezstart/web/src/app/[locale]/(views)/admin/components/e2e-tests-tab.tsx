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
import {
  STATUS_VARIANT,
  formatRelativeTime,
  freshnessOf,
  getRunStatus,
  type FreshnessBucket,
  type NeedsRerunResponse,
  type SummaryStatsResponse,
  type TestDefinition,
  type TestsListResponse,
} from './e2e-tests-types'

// ─── Fetchers ────────────────────────────────────────────────────────────

async function fetchTests(): Promise<TestsListResponse> {
  return apiCall<TestsListResponse>('/e2e-tests', { appName: 'ezstart' })
}

async function fetchSummary(): Promise<SummaryStatsResponse> {
  return apiCall<SummaryStatsResponse>('/e2e-tests/stats/summary', { appName: 'ezstart' })
}

async function fetchNeedsRerun(): Promise<NeedsRerunResponse> {
  return apiCall<NeedsRerunResponse>('/e2e-tests/needs-rerun', { appName: 'ezstart' })
}

// ─── Component ───────────────────────────────────────────────────────────

export function E2ETestsTab() {
  const t = useTranslations('admin.e2eTests')

  // Filters
  const [appFilter, setAppFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [freshnessFilter, setFreshnessFilter] = useState<FreshnessBucket>('all')
  const [needsRerunOnly, setNeedsRerunOnly] = useState(false)

  // Drawer
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  // Queries
  const {
    data: testsData,
    isLoading: testsLoading,
    error: testsError,
  } = useQuery({
    queryKey: ['admin-e2e-tests'],
    queryFn: fetchTests,
    staleTime: 30 * 1000,
  })

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

  // Stats display values
  const total = summaryData?.total ?? 0
  const passCount = summaryData?.pass ?? 0
  const failCount = summaryData?.fail ?? 0
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0
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
              <P className="text-2xl font-semibold mt-1 tabular-nums text-success">{passRate}%</P>
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
