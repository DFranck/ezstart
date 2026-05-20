/**
 * Public texts + props contract for `<AuthErrorLogsSection>`.
 *
 * Extracted from the section component so the main file stays under the
 * 400-line policy ceiling. SDK-i18n-agnostic — every label has an English
 * default the consumer can override via the `texts` prop.
 *
 * @internal
 */

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

/** @internal */
export type LevelFilter = 'all' | 'error' | 'warn' | 'fatal'
/** @internal */
export type StatusFilter = 'all' | '4xx' | '5xx'
