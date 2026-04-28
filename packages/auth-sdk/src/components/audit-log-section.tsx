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
  Icon,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { useAuditLog } from '../react/audit-log.js'
import type { AuditLogAction, AuditLogEntry } from '../core/types.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditLogSectionTexts {
  title: string
  description: string
  retentionFree: string
  retentionPro: string
  empty: string
  loading: string
  error: string
  retry: string
  /** Filter dropdown labels */
  filterLabel: string
  filterAll: string
  filterLogin: string
  filterSecurity: string
  filterApiKeys: string
  filterProfile: string
  /** Column headers */
  columnDate: string
  columnAction: string
  columnDetails: string
  columnStatus: string
  /** Status badge */
  statusOk: string
  /** Per-action labels */
  actions: Record<AuditLogAction, string>
  /** Pagination — DataTable */
  paginationPrevious?: string
  paginationNext?: string
  paginationRows?: string
  paginationPageOf?: string
}

export interface AuditLogSectionProps {
  /** Page size (default 20). */
  pageSize?: number
  /** Locale for date formatting (`'en'`, `'fr'`, `'vi'`). Defaults to `'en'`. */
  locale?: string
  /** Plan label shown in the retention banner. Defaults to `'free'`. */
  plan?: 'free' | 'pro'
  /** Override default i18n labels. Falls back to English. */
  texts?: Partial<AuditLogSectionTexts>
  /** Disable fetching (used while waiting for auth). */
  enabled?: boolean
  /** Additional className on the root card. */
  className?: string
  /**
   * Server-side pre-fetched audit log entries (via `getServerAuditLog()`
   * from `@ezstart/auth-sdk/server`). When provided, the React Query cache
   * is seeded so the very first paint already shows the table — no client
   * `<Spinner>` flash. React Query still revalidates in the background to
   * keep the data fresh.
   *
   * NOTE: only applies to the default page (`offset=0`, no action filter).
   * Subsequent filter switches re-fetch normally.
   */
  initialEntries?: AuditLogEntry[]
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: AuditLogSectionTexts = {
  title: 'Activity log',
  description: 'Recent actions performed on your account.',
  retentionFree: 'Last 30 days',
  retentionPro: 'Last 365 days',
  empty: 'No activity recorded yet.',
  loading: 'Loading activity...',
  error: 'Failed to load activity log.',
  retry: 'Retry',
  filterLabel: 'Filter',
  filterAll: 'All actions',
  filterLogin: 'Login & Logout',
  filterSecurity: 'Security',
  filterApiKeys: 'API keys',
  filterProfile: 'Profile',
  columnDate: 'Date',
  columnAction: 'Action',
  columnDetails: 'Details',
  columnStatus: 'Status',
  statusOk: 'OK',
  actions: {
    login: 'Logged in',
    logout: 'Logged out',
    password_change: 'Password changed',
    email_change: 'Email changed',
    oauth_link: 'OAuth account linked',
    oauth_unlink: 'OAuth account unlinked',
    '2fa_enabled': '2FA enabled',
    '2fa_disabled': '2FA disabled',
    session_revoked: 'Session revoked',
    api_key_created: 'API key created',
    api_key_revoked: 'API key revoked',
    profile_updated: 'Profile updated',
  },
  paginationPrevious: 'Previous',
  paginationNext: 'Next',
  paginationRows: '{count} row(s)',
  paginationPageOf: 'Page {current} of {total}',
}

// Filter group → set of action types it expands to.
const FILTER_GROUPS: Record<string, AuditLogAction[]> = {
  all: [],
  login: ['login', 'logout'],
  security: ['password_change', '2fa_enabled', '2fa_disabled', 'session_revoked'],
  apiKeys: ['api_key_created', 'api_key_revoked'],
  profile: ['profile_updated', 'email_change', 'oauth_link', 'oauth_unlink'],
}

type FilterGroup = keyof typeof FILTER_GROUPS

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatDetails(entry: AuditLogEntry): string {
  const parts: string[] = []
  const ip = typeof entry.metadata.ip === 'string' ? entry.metadata.ip : null
  const location = typeof entry.metadata.location === 'string' ? entry.metadata.location : null
  if (location) parts.push(location)
  if (ip) parts.push(ip)
  return parts.join(' · ') || '—'
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AuditLogSection({
  pageSize = 20,
  locale = 'en',
  plan = 'free',
  texts: textOverrides,
  enabled = true,
  className,
  initialEntries,
}: AuditLogSectionProps) {
  const texts: AuditLogSectionTexts = {
    ...DEFAULT_TEXTS,
    ...textOverrides,
    actions: { ...DEFAULT_TEXTS.actions, ...textOverrides?.actions },
  }
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('all')

  // The endpoint accepts ONE action filter per request — when the user
  // selects a group with multiple actions we drop the server filter and
  // post-filter on the client (the dataset is small per-user).
  const groupActions = FILTER_GROUPS[filterGroup] ?? []
  const singleAction = groupActions.length === 1 ? groupActions[0] : undefined

  // Seed the cache with SSR-prefetched entries when present. Only applies to
  // the initial query (`offset=0`, no action filter) — once the user toggles
  // a filter, the new query key bypasses the seed and fetches fresh data.
  const initialAuditData =
    initialEntries && filterGroup === 'all' && !singleAction
      ? {
          items: initialEntries,
          total: initialEntries.length,
          limit: pageSize,
          offset: 0,
        }
      : undefined

  const { data, isLoading, isError, refetch, isFetching } = useAuditLog(
    { limit: pageSize, offset: 0, action: singleAction },
    enabled,
    initialAuditData ? { initialData: initialAuditData } : undefined
  )

  const allItems = data?.items ?? []
  const visibleItems = useMemo(() => {
    if (filterGroup === 'all' || singleAction) return allItems
    const set = new Set(groupActions)
    return allItems.filter(item => set.has(item.action))
  }, [allItems, filterGroup, singleAction, groupActions])

  const columns: ColumnDef<AuditLogEntry>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: texts.columnDate,
        cell: ({ row }) => (
          <Span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt, locale)}
          </Span>
        ),
      },
      {
        accessorKey: 'action',
        header: texts.columnAction,
        cell: ({ row }) => (
          <Span className="text-sm font-medium text-foreground">
            {texts.actions[row.original.action] ?? row.original.action}
          </Span>
        ),
      },
      {
        id: 'details',
        header: texts.columnDetails,
        cell: ({ row }) => (
          <Span className="text-xs text-muted-foreground">{formatDetails(row.original)}</Span>
        ),
        enableSorting: false,
      },
      {
        id: 'status',
        header: texts.columnStatus,
        cell: () => (
          <Badge variant="success" size="xs">
            {texts.statusOk}
          </Badge>
        ),
        enableSorting: false,
      },
    ],
    [texts, locale]
  )

  const retentionLabel = plan === 'pro' ? texts.retentionPro : texts.retentionFree

  return (
    <Card className={className}>
      <CardHeader>
        <Div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Div>
            <CardTitle className="text-xl font-bold">{texts.title}</CardTitle>
            <CardDescription>{texts.description}</CardDescription>
          </Div>
          <Div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="sm">
              <Icon name="lucide:CalendarClock" className="h-3 w-3 mr-1" />
              {retentionLabel}
            </Badge>
          </Div>
        </Div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter dropdown */}
        <Div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Div className="flex items-center gap-2">
            <Span className="text-xs font-medium text-muted-foreground">{texts.filterLabel}:</Span>
            <Select value={filterGroup} onValueChange={v => setFilterGroup(v as FilterGroup)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.filterAll}</SelectItem>
                <SelectItem value="login">{texts.filterLogin}</SelectItem>
                <SelectItem value="security">{texts.filterSecurity}</SelectItem>
                <SelectItem value="apiKeys">{texts.filterApiKeys}</SelectItem>
                <SelectItem value="profile">{texts.filterProfile}</SelectItem>
              </SelectContent>
            </Select>
          </Div>
          {isFetching && !isLoading && (
            <Span className="text-xs text-muted-foreground">{texts.loading}</Span>
          )}
        </Div>

        {/* Body */}
        {isLoading ? (
          <Div className="flex items-center justify-center py-12">
            <Spinner variant="primary" size="lg" />
          </Div>
        ) : isError ? (
          <Div className="flex flex-col items-center gap-3 py-8 text-center">
            <Icon name="lucide:AlertTriangle" className="h-10 w-10 text-destructive" />
            <P className="text-sm text-destructive">{texts.error}</P>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {texts.retry}
            </Button>
          </Div>
        ) : visibleItems.length === 0 ? (
          <Div className="flex flex-col items-center gap-3 py-8 text-center">
            <Icon name="lucide:History" className="h-10 w-10 text-muted-foreground/50" />
            <P className="text-sm text-muted-foreground">{texts.empty}</P>
          </Div>
        ) : (
          <DataTable
            columns={columns}
            data={visibleItems}
            pageSize={pageSize}
            density="compact"
            texts={{
              previous: texts.paginationPrevious,
              next: texts.paginationNext,
              rows: texts.paginationRows,
              pageOf: texts.paginationPageOf,
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
