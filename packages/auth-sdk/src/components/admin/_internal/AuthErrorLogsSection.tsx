'use client'

import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type ColumnDef,
  DataTable,
  Div,
  H3,
  Icon,
  Modal,
  P,
  Pre,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
  Spinner,
  Input,
  Label,
} from '@ezstart/ui/components'
import {
  useAdminErrorLogs,
  useAdminErrorLogDetail,
  type ErrorLogLevel,
  type ErrorLogListEntry,
  type ErrorLogStatusRange,
} from '../../../react/admin-error-logs.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AuthErrorLogsSectionTexts {
  title?: string
  subtitle?: string

  // Filter labels
  filterLevelLabel?: string
  filterLevelAll?: string
  filterLevelError?: string
  filterLevelWarn?: string
  filterLevelFatal?: string
  filterStatusLabel?: string
  filterStatusAll?: string
  filterStatus4xx?: string
  filterStatus5xx?: string
  filterUrlLabel?: string
  filterUrlPlaceholder?: string

  // Table column headers
  columnTimestamp?: string
  columnLevel?: string
  columnMethod?: string
  columnUrl?: string
  columnStatus?: string
  columnMessage?: string
  columnUser?: string
  columnActions?: string
  viewAction?: string

  // States
  loading?: string
  empty?: string
  loadError?: string
  retry?: string

  // Detail modal
  detailTitle?: string
  detailMessage?: string
  detailErrorName?: string
  detailStack?: string
  detailContext?: string
  detailUserAgent?: string
  detailRelease?: string
  detailEnv?: string
  detailIp?: string
  detailNoStack?: string
  detailNoContext?: string
  closeButton?: string

  // Pagination
  paginationPrevious?: string
  paginationNext?: string
  paginationRows?: string
  paginationPageOf?: string
}

export const DEFAULT_ERROR_LOGS_TEXTS: Required<AuthErrorLogsSectionTexts> = {
  title: 'Error logs',
  subtitle:
    'Recent unhandled errors captured by the API. Auto-deleted after 30 days. Superadmin only.',
  filterLevelLabel: 'Level',
  filterLevelAll: 'All levels',
  filterLevelError: 'Error',
  filterLevelWarn: 'Warning',
  filterLevelFatal: 'Fatal',
  filterStatusLabel: 'Status',
  filterStatusAll: 'All status',
  filterStatus4xx: '4xx (client)',
  filterStatus5xx: '5xx (server)',
  filterUrlLabel: 'URL contains',
  filterUrlPlaceholder: '/api/...',
  columnTimestamp: 'When',
  columnLevel: 'Level',
  columnMethod: 'Method',
  columnUrl: 'URL',
  columnStatus: 'Status',
  columnMessage: 'Message',
  columnUser: 'User',
  columnActions: '',
  viewAction: 'View',
  loading: 'Loading errors...',
  empty: 'No errors logged in the selected window.',
  loadError: 'Failed to load error logs.',
  retry: 'Retry',
  detailTitle: 'Error detail',
  detailMessage: 'Message',
  detailErrorName: 'Type',
  detailStack: 'Stack trace',
  detailContext: 'Context',
  detailUserAgent: 'User agent',
  detailRelease: 'Release',
  detailEnv: 'Environment',
  detailIp: 'IP',
  detailNoStack: 'No stack trace captured.',
  detailNoContext: 'No context attached.',
  closeButton: 'Close',
  paginationPrevious: 'Previous',
  paginationNext: 'Next',
  paginationRows: '{count} row(s)',
  paginationPageOf: 'Page {current} of {total}',
}

export interface AuthErrorLogsSectionProps {
  className?: string
  texts?: Partial<AuthErrorLogsSectionTexts>
  /** Page size — default 50, max 200. */
  pageSize?: number
  /** Locale for date formatting — default `'en'`. */
  locale?: string
  /**
   * Override the EZAuth API base URL — required for federated admin (Tier 3
   * hub embedding the SDK against a remote EZAuth deployment).
   */
  apiUrl?: string
  /** Override the bearer token used for the request. */
  authToken?: string | (() => string | Promise<string>)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type LevelFilter = 'all' | 'error' | 'warn' | 'fatal'
type StatusFilter = 'all' | '4xx' | '5xx'

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function levelBadgeVariant(level: ErrorLogLevel): 'destructive' | 'warning' | 'default' {
  if (level === 'fatal') return 'destructive'
  if (level === 'warn') return 'warning'
  return 'default'
}

function statusBadgeVariant(statusCode?: number): 'destructive' | 'warning' | 'secondary' {
  if (!statusCode) return 'secondary'
  if (statusCode >= 500) return 'destructive'
  if (statusCode >= 400) return 'warning'
  return 'secondary'
}

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

  const columns: ColumnDef<ErrorLogListEntry>[] = useMemo(
    () => [
      {
        accessorKey: 'timestamp',
        header: t.columnTimestamp,
        cell: ({ row }) => (
          <Span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.timestamp, locale)}
          </Span>
        ),
      },
      {
        accessorKey: 'level',
        header: t.columnLevel,
        cell: ({ row }) => (
          <Badge variant={levelBadgeVariant(row.original.level)} size="xs">
            {row.original.level}
          </Badge>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'method',
        header: t.columnMethod,
        cell: ({ row }) => (
          <Span className="text-xs font-mono text-muted-foreground">
            {row.original.method ?? '—'}
          </Span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'url',
        header: t.columnUrl,
        cell: ({ row }) => (
          <Span className="text-xs font-mono text-foreground truncate max-w-[260px] block">
            {row.original.url ?? '—'}
          </Span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'statusCode',
        header: t.columnStatus,
        cell: ({ row }) =>
          row.original.statusCode ? (
            <Badge variant={statusBadgeVariant(row.original.statusCode)} size="xs">
              {row.original.statusCode}
            </Badge>
          ) : (
            <Span className="text-xs text-muted-foreground">—</Span>
          ),
        enableSorting: false,
      },
      {
        accessorKey: 'message',
        header: t.columnMessage,
        cell: ({ row }) => (
          <Span className="text-xs text-foreground truncate max-w-[300px] block">
            {row.original.message}
          </Span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'userId',
        header: t.columnUser,
        cell: ({ row }) => (
          <Span className="text-xs font-mono text-muted-foreground truncate max-w-[140px] block">
            {row.original.userId ?? '—'}
          </Span>
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        header: t.columnActions,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedId(row.original._id)}
          >
            {t.viewAction}
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [t, locale]
  )

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

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

interface ErrorLogDetailModalProps {
  id: string
  texts: Required<AuthErrorLogsSectionTexts>
  locale: string
  apiUrl?: string
  authToken?: string | (() => string | Promise<string>)
  onClose: () => void
}

function ErrorLogDetailModal({
  id,
  texts,
  locale,
  apiUrl,
  authToken,
  onClose,
}: ErrorLogDetailModalProps) {
  const { data, isLoading, isError } = useAdminErrorLogDetail(id, {
    ...(apiUrl ? { apiUrl } : {}),
    ...(authToken !== undefined ? { authToken } : {}),
  })

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      title={texts.detailTitle}
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          {texts.closeButton}
        </Button>
      }
    >
      {isLoading ? (
        <Div
          className="flex items-center justify-center py-8"
          role="status"
          aria-busy="true"
          aria-label={texts.loading}
        >
          <Spinner variant="primary" size="lg" />
        </Div>
      ) : isError || !data ? (
        <Div className="flex flex-col items-center gap-3 py-8 text-center">
          <Icon name="lucide:AlertTriangle" className="h-10 w-10 text-destructive" />
          <P className="text-sm text-destructive">{texts.loadError}</P>
        </Div>
      ) : (
        <Div className="space-y-4">
          <Div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <DetailField label={texts.columnTimestamp}>
              {formatDate(data.timestamp, locale)}
            </DetailField>
            <DetailField label={texts.columnLevel}>
              <Badge variant={levelBadgeVariant(data.level)} size="xs">
                {data.level}
              </Badge>
            </DetailField>
            <DetailField label={texts.detailErrorName}>{data.errorName ?? '—'}</DetailField>
            <DetailField label={texts.columnStatus}>
              {data.statusCode ? (
                <Badge variant={statusBadgeVariant(data.statusCode)} size="xs">
                  {data.statusCode}
                </Badge>
              ) : (
                '—'
              )}
            </DetailField>
            <DetailField label={texts.columnMethod}>
              <Span className="font-mono text-xs">{data.method ?? '—'}</Span>
            </DetailField>
            <DetailField label={texts.columnUrl}>
              <Span className="font-mono text-xs break-all">{data.url ?? '—'}</Span>
            </DetailField>
            <DetailField label={texts.columnUser}>
              <Span className="font-mono text-xs">{data.userId ?? '—'}</Span>
            </DetailField>
            <DetailField label={texts.detailIp}>
              <Span className="font-mono text-xs">{data.ip ?? '—'}</Span>
            </DetailField>
            <DetailField label={texts.detailEnv}>{data.env ?? '—'}</DetailField>
            <DetailField label={texts.detailRelease}>
              <Span className="font-mono text-xs">{data.releaseSha ?? '—'}</Span>
            </DetailField>
            {data.userAgent && (
              <DetailField label={texts.detailUserAgent} className="sm:col-span-2">
                <Span className="text-xs text-muted-foreground break-all">{data.userAgent}</Span>
              </DetailField>
            )}
          </Div>

          <Div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {texts.detailMessage}
            </Label>
            <Pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {data.message}
            </Pre>
          </Div>

          <Div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{texts.detailStack}</Label>
            <Pre className="text-[11px] bg-muted rounded-md p-3 overflow-x-auto max-h-[400px] whitespace-pre-wrap break-all">
              {data.stack ?? texts.detailNoStack}
            </Pre>
          </Div>

          <Div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {texts.detailContext}
            </Label>
            <Pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {data.context ? JSON.stringify(data.context, null, 2) : texts.detailNoContext}
            </Pre>
          </Div>
        </Div>
      )}
    </Modal>
  )
}

interface DetailFieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

function DetailField({ label, children, className }: DetailFieldProps) {
  return (
    <Div className={className}>
      <P className="text-xs font-medium text-muted-foreground mb-0.5">{label}</P>
      <Div className="text-sm text-foreground">{children}</Div>
    </Div>
  )
}
