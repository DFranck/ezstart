'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { apiCall } from '@ezstart/api-sdk'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  P,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Span,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { EnvBadge } from './env-badge'
import {
  RUN_ENVS,
  STATUS_VARIANT,
  formatDuration,
  type EnvFilter,
  type RunEnv,
  type TestHistoryResponse,
} from './e2e-tests-types'

async function fetchHistory(testId: string): Promise<TestHistoryResponse> {
  return apiCall<TestHistoryResponse>(`/e2e-tests/${encodeURIComponent(testId)}`, {
    appName: 'ezstart',
  })
}

interface HistoryDrawerProps {
  testId: string | null
  open: boolean
  onClose: () => void
}

export function E2ETestsHistoryDrawer({ testId, open, onClose }: HistoryDrawerProps) {
  const t = useTranslations('admin.e2eTests')
  const [activeEnvTab, setActiveEnvTab] = useState<EnvFilter>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-e2e-tests-history', testId ?? ''],
    queryFn: () => fetchHistory(testId as string),
    enabled: open && !!testId,
  })

  // Filter run history by the active env tab. 'all' shows every run mixed.
  // Guards against legacy runs without env (treats them as 'local' since the
  // migration backfill maps them all to 'local').
  const visibleRuns = useMemo(() => {
    if (!data) return []
    if (activeEnvTab === 'all') return data.runs
    return data.runs.filter(run => (run.env ?? 'local') === activeEnvTab)
  }, [data, activeEnvTab])

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('history.title')}</SheetTitle>
          <SheetDescription>{testId ?? ''}</SheetDescription>
        </SheetHeader>

        <Div className="mt-6 space-y-6 px-4 pb-6">
          {isLoading && (
            <Div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </Div>
          )}

          {error && (
            <Card variant="floating">
              <CardContent className="py-4">
                <P className="text-sm text-destructive">{t('history.failedToLoad')}</P>
                <P className="text-xs text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : String(error)}
                </P>
              </CardContent>
            </Card>
          )}

          {data && (
            <>
              {/* Stats */}
              <Div className="grid grid-cols-2 gap-3">
                <Card className="p-4">
                  <P className="text-xs text-muted-foreground">{t('history.passRate')}</P>
                  <P className="text-2xl font-semibold mt-1">{data.stats.passRate}%</P>
                </Card>
                <Card className="p-4">
                  <P className="text-xs text-muted-foreground">{t('history.avgDuration')}</P>
                  <P className="text-2xl font-semibold mt-1">
                    {formatDuration(data.stats.avgDurationMs)}
                  </P>
                </Card>
              </Div>

              {/* Definition meta */}
              <Card variant="floating">
                <CardHeader>
                  <H3 size="h5">{data.definition.feature}</H3>
                  <P className="text-xs text-muted-foreground">{data.definition.app}</P>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.definition.description && (
                    <P className="text-sm text-muted-foreground">{data.definition.description}</P>
                  )}
                  {data.definition.exercises && data.definition.exercises.length > 0 && (
                    <Div className="space-y-1">
                      <P className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('history.exercises')}
                      </P>
                      <Div className="flex flex-wrap gap-1">
                        {data.definition.exercises.map(file => (
                          <Badge key={file} variant="outline" size="xs">
                            {file}
                          </Badge>
                        ))}
                      </Div>
                    </Div>
                  )}
                </CardContent>
              </Card>

              {/* Per-env stats — surfaces production health vs dev health */}
              {data.stats.byEnv && (
                <Div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RUN_ENVS.map(env => {
                    const bucket = data.stats.byEnv?.[env]
                    return (
                      <Card key={env} className="p-3">
                        <Div className="flex items-center gap-2">
                          <EnvBadge env={env} tooltip={t(`env.${env}`)} size="xs" />
                          <P className="text-xs text-muted-foreground">
                            {bucket?.total ?? 0} {t('history.runs')}
                          </P>
                        </Div>
                        <P className="text-xl font-semibold mt-1 tabular-nums">
                          {bucket?.passRate ?? 0}%
                        </P>
                        <P className="text-xs text-muted-foreground">{t('history.passRate')}</P>
                      </Card>
                    )
                  })}
                </Div>
              )}

              {/* Run history grouped by env via tabs */}
              <Div className="space-y-3">
                <H3 size="h5">{t('history.runs')}</H3>
                <Tabs value={activeEnvTab} onValueChange={v => setActiveEnvTab(v as EnvFilter)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="all">{t('env.all')}</TabsTrigger>
                    {RUN_ENVS.map(env => (
                      <TabsTrigger key={env} value={env}>
                        {t(`env.${env}`)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value={activeEnvTab} className="space-y-3 mt-3">
                    {visibleRuns.length === 0 && (
                      <P className="text-sm text-muted-foreground italic">{t('history.noRuns')}</P>
                    )}
                    {visibleRuns.map((run, idx) => {
                      const runEnv: RunEnv = (run.env ?? 'local') as RunEnv
                      return (
                        <Card key={`${run.runAt}-${idx}`} variant="floating">
                          <CardContent className="py-3 space-y-2">
                            <Div className="flex items-center justify-between gap-2">
                              <Div className="flex items-center gap-2">
                                <Badge variant={STATUS_VARIANT[run.status]} size="sm" dot>
                                  {t(`status.${run.status}`)}
                                </Badge>
                                <EnvBadge env={runEnv} tooltip={t(`env.${runEnv}`)} />
                              </Div>
                              <Span className="text-xs text-muted-foreground tabular-nums">
                                {new Date(run.runAt).toLocaleString()}
                              </Span>
                            </Div>
                            <Div className="flex items-center justify-between text-xs text-muted-foreground">
                              <Span>
                                {t('history.agent')}:{' '}
                                <Span className="font-medium text-foreground">{run.agent}</Span>
                              </Span>
                              <Span>{formatDuration(run.durationMs)}</Span>
                            </Div>
                            {run.errors && run.errors.length > 0 && (
                              <Div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
                                {run.errors.map((err, i) => (
                                  <P key={i} className="text-xs text-destructive break-words">
                                    {err}
                                  </P>
                                ))}
                              </Div>
                            )}
                            {run.notes && (
                              <P className="text-xs italic text-muted-foreground">{run.notes}</P>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </TabsContent>
                </Tabs>
              </Div>
            </>
          )}
        </Div>
      </SheetContent>
    </Sheet>
  )
}
