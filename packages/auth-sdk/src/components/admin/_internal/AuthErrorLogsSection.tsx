'use client'

import { useCallback, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Div,
  H3,
  Icon,
  Input,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import {
  useAdminErrorLogs,
  type ErrorLogLevel,
  type ErrorLogStatusRange,
} from '../../../react/admin-error-logs.js'
import {
  type AuthErrorLogsSectionProps,
  type AuthErrorLogsSectionTexts,
  DEFAULT_ERROR_LOGS_TEXTS,
  type LevelFilter,
  type StatusFilter,
} from './error-logs/texts.js'
import { ErrorLogDetailModal } from './error-logs/ErrorLogDetailModal.js'
import { useErrorLogColumns } from './error-logs/useErrorLogColumns.js'

export {
  type AuthErrorLogsSectionProps,
  type AuthErrorLogsSectionTexts,
  DEFAULT_ERROR_LOGS_TEXTS,
} from './error-logs/texts.js'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Internal admin section embedded in `<AuthAdminDashboard>`.
 *
 * Browses errors persisted by the API's local `error_logs` collection
 * (Sentry-free stopgap). Filterable by level / statusCode range / URL /
 * userId. Click a row to inspect the full stack + context in a modal.
 *
 * @internal
 */
export function AuthErrorLogsSection({
  className,
  texts,
  pageSize = 50,
  locale = 'en',
  apiUrl,
  authToken,
}: AuthErrorLogsSectionProps) {
  const t: Required<AuthErrorLogsSectionTexts> = { ...DEFAULT_ERROR_LOGS_TEXTS, ...texts }

  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [urlFilter, setUrlFilter] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError, isFetching, refetch } = useAdminErrorLogs(
    {
      limit: pageSize,
      offset: 0,
      ...(levelFilter !== 'all' ? { level: levelFilter as ErrorLogLevel } : {}),
      ...(statusFilter !== 'all' ? { statusCodeRange: statusFilter as ErrorLogStatusRange } : {}),
      ...(urlFilter.trim().length > 0 ? { url: urlFilter.trim() } : {}),
    },
    {
      ...(apiUrl ? { apiUrl } : {}),
      ...(authToken !== undefined ? { authToken } : {}),
    }
  )

  const items = data?.items ?? []

  const handleView = useCallback((id: string) => setSelectedId(id), [])
  const columns = useErrorLogColumns(t, locale, handleView)

  return (
    <Div className={className}>
      <Div className="space-y-4">
        <Div className="space-y-1">
          <H3 size="h4">{t.title}</H3>
          <P className="text-sm text-muted-foreground">{t.subtitle}</P>
        </Div>

        {/* Filters */}
        <Card variant="floating">
          <CardContent className="pt-4">
            <Div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <Div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t.filterLevelLabel}
                </Label>
                <Select value={levelFilter} onValueChange={v => setLevelFilter(v as LevelFilter)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.filterLevelAll}</SelectItem>
                    <SelectItem value="error">{t.filterLevelError}</SelectItem>
                    <SelectItem value="warn">{t.filterLevelWarn}</SelectItem>
                    <SelectItem value="fatal">{t.filterLevelFatal}</SelectItem>
                  </SelectContent>
                </Select>
              </Div>
              <Div className="flex flex-col gap-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t.filterStatusLabel}
                </Label>
                <Select
                  value={statusFilter}
                  onValueChange={v => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.filterStatusAll}</SelectItem>
                    <SelectItem value="4xx">{t.filterStatus4xx}</SelectItem>
                    <SelectItem value="5xx">{t.filterStatus5xx}</SelectItem>
                  </SelectContent>
                </Select>
              </Div>
              <Div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <Label
                  htmlFor="error-log-url-filter"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t.filterUrlLabel}
                </Label>
                <Input
                  id="error-log-url-filter"
                  type="text"
                  value={urlFilter}
                  placeholder={t.filterUrlPlaceholder}
                  onChange={e => setUrlFilter(e.target.value)}
                />
              </Div>
              {isFetching && !isLoading && (
                <Span className="text-xs text-muted-foreground sm:self-center">{t.loading}</Span>
              )}
            </Div>
          </CardContent>
        </Card>

        {/* Body */}
        {isError ? (
          <Card variant="floating">
            <CardContent className="pt-4">
              <Div className="flex flex-col items-center gap-3 py-8 text-center">
                <Icon name="lucide:AlertTriangle" className="h-10 w-10 text-destructive" />
                <P className="text-sm text-destructive">{t.loadError}</P>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {t.retry}
                </Button>
              </Div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Div
            className="flex items-center justify-center py-12"
            role="status"
            aria-busy="true"
            aria-label={t.loading}
          >
            <Spinner variant="primary" size="lg" />
          </Div>
        ) : items.length === 0 ? (
          <Card variant="floating">
            <CardContent className="pt-4">
              <Div className="flex flex-col items-center gap-3 py-8 text-center">
                <Icon name="lucide:ShieldCheck" className="h-10 w-10 text-muted-foreground/50" />
                <P className="text-sm text-muted-foreground">{t.empty}</P>
              </Div>
            </CardContent>
          </Card>
        ) : (
          <Card variant="floating">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {data?.total ?? items.length} entries
              </CardTitle>
              <CardDescription>
                Showing {items.length} most recent. Filter to narrow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={items}
                pageSize={pageSize}
                density="compact"
                texts={{
                  previous: t.paginationPrevious,
                  next: t.paginationNext,
                  rows: t.paginationRows,
                  pageOf: t.paginationPageOf,
                }}
              />
            </CardContent>
          </Card>
        )}
      </Div>

      {selectedId && (
        <ErrorLogDetailModal
          id={selectedId}
          texts={t}
          locale={locale}
          {...(apiUrl ? { apiUrl } : {})}
          {...(authToken !== undefined ? { authToken } : {})}
          onClose={() => setSelectedId(null)}
        />
      )}
    </Div>
  )
}
