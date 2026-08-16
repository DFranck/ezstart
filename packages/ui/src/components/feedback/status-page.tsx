'use client'

/**
 * StatusPage — public real-time service health page.
 *
 * Pings each service `/health` endpoint in parallel from the browser, derives
 * a global status (operational / degraded / down), and auto-refreshes on a
 * configurable interval. All copy is i18n-agnostic via the `texts` prop with
 * sensible English defaults so consumers can drop it in unmodified or wire
 * `next-intl` translations.
 *
 * @example
 * ```tsx
 * <StatusPage
 *   services={[
 *     { name: 'EZAuth API', url: 'https://ezauth-api.ezstart.xyz/health' },
 *     { name: 'EZPay API', url: 'https://ezpay-api.ezstart.xyz/health' },
 *   ]}
 *   refreshIntervalMs={30_000}
 * />
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Badge } from '../data-display/badge'
import { Button } from '../button'
import { Card, CardContent, CardHeader } from '../data-display/card'
import { DependencyList } from './dependency-list'
import { Spinner } from './spinner'
import { Div, H1, H2, Main, P, Section, Span } from '../tag'
import { checkOne } from './status-page-check'
import type {
  StatusDependency,
  StatusService,
  StatusServiceMode,
  StatusServiceResult,
  StatusServiceState,
} from './status-page-types'

// Re-exports — preserve the existing public surface of this module.
export type {
  StatusDependency,
  StatusService,
  StatusServiceMode,
  StatusServiceResult,
  StatusServiceState,
}

export interface StatusPageTexts {
  /** Page title. Default `"Status"`. */
  title: string
  /** Optional intro paragraph below the title. */
  intro: string
  /** Heading for the per-service component list. */
  componentsHeading: string
  /** Heading for the incidents card. */
  incidentsHeading: string
  /** Body copy for the incidents card when no incident is active. */
  incidentsBody: string
  /** Banner text when ALL services are healthy. */
  summaryOperational: string
  /** Banner text when AT LEAST ONE service is unreachable but others healthy. */
  summaryDegraded: string
  /** Banner text when ALL services are unreachable. */
  summaryDown: string
  /** Banner text while the first batch of checks is in flight. */
  summaryChecking: string
  /** Per-service badge label when 2xx response. */
  stateOperational: string
  /** Per-service badge label when non-2xx or timeout. */
  stateDegraded: string
  /** Per-service badge label when network unreachable. */
  stateDown: string
  /** Per-service badge label while checking. */
  stateChecking: string
  /** Suffix for the per-service "last checked" line, e.g. `"Last checked"`. */
  lastCheckedLabel: string
  /** Suffix for response time, e.g. `"Response time"`. */
  responseTimeLabel: string
  /**
   * Auto-refresh hint shown beside the summary, e.g. `"Auto-refreshes every 30s"`.
   *
   * Already-interpolated string. The caller is responsible for substituting any
   * placeholders (e.g. via `t('refreshHint', { seconds: 30 })` with next-intl)
   * before passing it in. The component renders the string as-is.
   */
  refreshHint: string
  /** Manual refresh button label. */
  refreshButton: string
  /** Heading for the per-service dependency sublist (deep mode). */
  dependenciesLabel: string
  /** Dependency status badge label when `status === 'ok'`. */
  checkStatusOk: string
  /** Dependency status badge label when `status === 'degraded'`. */
  checkStatusDegraded: string
  /** Dependency status badge label when `status === 'down'`. */
  checkStatusDown: string
}

export const defaultStatusPageTexts: StatusPageTexts = {
  title: 'Status',
  intro: 'Real-time health of all platform services. Auto-updated.',
  componentsHeading: 'Service components',
  incidentsHeading: 'Incidents',
  incidentsBody: 'No active incidents reported.',
  summaryOperational: 'All systems operational',
  summaryDegraded: 'Partial service disruption',
  summaryDown: 'Major outage',
  summaryChecking: 'Checking services',
  stateOperational: 'Operational',
  stateDegraded: 'Degraded',
  stateDown: 'Down',
  stateChecking: 'Checking',
  lastCheckedLabel: 'Last checked',
  responseTimeLabel: 'Response time',
  refreshHint: 'Auto-refreshes every 30s',
  refreshButton: 'Refresh now',
  dependenciesLabel: 'Dependencies',
  checkStatusOk: 'OK',
  checkStatusDegraded: 'Slow',
  checkStatusDown: 'Down',
}

export interface StatusPageProps {
  /** List of services to monitor. Required, at least one. */
  services: StatusService[]
  /** Auto-refresh interval (ms). Default 30 000 (30s). Set 0 to disable. */
  refreshIntervalMs?: number
  /** Per-request timeout (ms). Default 5 000. */
  fetchTimeoutMs?: number
  /** Override copy for any/all texts. Falls back to `defaultStatusPageTexts`. */
  texts?: Partial<StatusPageTexts>
  /** Locale string (BCP 47) used to format the "last checked" timestamp. Default `'en'`. */
  locale?: string
}

const FETCH_TIMEOUT_DEFAULT = 5_000
const REFRESH_INTERVAL_DEFAULT = 30_000

/**
 * Derive the global page status from individual service results.
 * - `checking` while any service is still in its initial check
 * - `down` when every reachable service is down
 * - `degraded` when at least one is non-operational
 * - `operational` when all are operational
 *
 * Exported for unit tests.
 */
export function deriveGlobalStatus(results: StatusServiceResult[]): StatusServiceState {
  if (results.length === 0) return 'checking'
  if (results.some(r => r.state === 'checking')) return 'checking'

  const downCount = results.filter(r => r.state === 'down').length
  const degradedCount = results.filter(r => r.state === 'degraded').length

  if (downCount === results.length) return 'down'
  if (downCount > 0 || degradedCount > 0) return 'degraded'
  return 'operational'
}

const STATE_BADGE_VARIANT: Record<
  StatusServiceState,
  'success' | 'warning' | 'destructive' | 'secondary'
> = {
  operational: 'success',
  degraded: 'warning',
  down: 'destructive',
  checking: 'secondary',
}

export function StatusPage({
  services,
  refreshIntervalMs = REFRESH_INTERVAL_DEFAULT,
  fetchTimeoutMs = FETCH_TIMEOUT_DEFAULT,
  texts: textsOverride,
  locale = 'en',
}: StatusPageProps): React.JSX.Element {
  const texts = useMemo<StatusPageTexts>(
    () => ({ ...defaultStatusPageTexts, ...textsOverride }),
    [textsOverride]
  )

  const [results, setResults] = useState<StatusServiceResult[]>(() =>
    services.map(service => ({
      service,
      state: 'checking',
      responseTimeMs: null,
      statusCode: null,
      checkedAt: null,
      error: null,
    }))
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isMountedRef = useRef(true)

  const runChecks = useCallback(async () => {
    setIsRefreshing(true)
    const settled = await Promise.all(
      services.map(async service => {
        const outcome = await checkOne(service, fetchTimeoutMs)
        const result: StatusServiceResult = {
          service,
          state: outcome.state,
          responseTimeMs: outcome.responseTimeMs,
          statusCode: outcome.statusCode,
          checkedAt: new Date(),
          error: outcome.error,
        }
        if (outcome.dependencies) result.dependencies = outcome.dependencies
        return result
      })
    )
    if (isMountedRef.current) {
      setResults(settled)
      setIsRefreshing(false)
    }
  }, [services, fetchTimeoutMs])

  useEffect(() => {
    isMountedRef.current = true
    void runChecks()
    return () => {
      isMountedRef.current = false
    }
  }, [runChecks])

  useEffect(() => {
    if (refreshIntervalMs <= 0) return
    const id = setInterval(() => {
      void runChecks()
    }, refreshIntervalMs)
    return () => clearInterval(id)
  }, [refreshIntervalMs, runChecks])

  const globalStatus = deriveGlobalStatus(results)
  const summaryLabel =
    globalStatus === 'operational'
      ? texts.summaryOperational
      : globalStatus === 'degraded'
        ? texts.summaryDegraded
        : globalStatus === 'down'
          ? texts.summaryDown
          : texts.summaryChecking

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [locale]
  )

  return (
    <Main className="flex-1">
      <Section className="px-4 py-12 sm:py-16">
        <Div className="mx-auto max-w-3xl space-y-4 text-center">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{texts.title}</H1>
          <Div className="flex justify-center">
            <Badge
              variant={STATE_BADGE_VARIANT[globalStatus]}
              size="lg"
              dot
              pulse={globalStatus !== 'operational'}
              aria-live="polite"
            >
              {summaryLabel}
            </Badge>
          </Div>
          {texts.intro ? (
            <P className="text-base text-muted-foreground sm:text-lg">{texts.intro}</P>
          ) : null}
          <Div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4">
            {refreshIntervalMs > 0 ? <Span>{texts.refreshHint}</Span> : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void runChecks()}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? <Spinner size="xs" /> : null}
              <Span>{texts.refreshButton}</Span>
            </Button>
          </Div>
        </Div>
      </Section>

      <Section className="px-4 pb-16">
        <Div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <H2 size="h3">{texts.componentsHeading}</H2>
            </CardHeader>
            <CardContent>
              <Div className="divide-y" role="list">
                {results.map(result => (
                  <Div
                    key={result.service.url}
                    role="listitem"
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <Div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Div className="flex flex-col gap-0.5">
                        <Span className="font-medium text-foreground">{result.service.name}</Span>
                        {result.service.description ? (
                          <Span className="text-xs text-muted-foreground">
                            {result.service.description}
                          </Span>
                        ) : null}
                        {result.checkedAt ? (
                          <Span className="text-xs text-muted-foreground">
                            {texts.lastCheckedLabel}: {dateFormatter.format(result.checkedAt)}
                            {result.responseTimeMs !== null
                              ? ` · ${texts.responseTimeLabel}: ${result.responseTimeMs}ms`
                              : ''}
                          </Span>
                        ) : null}
                        {result.error && result.state !== 'operational' ? (
                          <Span className="text-xs text-destructive">{result.error}</Span>
                        ) : null}
                      </Div>
                      <Badge
                        variant={STATE_BADGE_VARIANT[result.state]}
                        size="sm"
                        dot
                        pulse={result.state === 'checking'}
                      >
                        {result.state === 'operational'
                          ? texts.stateOperational
                          : result.state === 'degraded'
                            ? texts.stateDegraded
                            : result.state === 'down'
                              ? texts.stateDown
                              : texts.stateChecking}
                      </Badge>
                    </Div>
                    {result.dependencies && result.dependencies.length > 0 ? (
                      <DependencyList
                        dependencies={result.dependencies}
                        label={texts.dependenciesLabel}
                        okLabel={texts.checkStatusOk}
                        degradedLabel={texts.checkStatusDegraded}
                        downLabel={texts.checkStatusDown}
                      />
                    ) : null}
                  </Div>
                ))}
              </Div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H2 size="h3">{texts.incidentsHeading}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{texts.incidentsBody}</P>
            </CardContent>
          </Card>
        </Div>
      </Section>
    </Main>
  )
}

StatusPage.displayName = 'StatusPage'
