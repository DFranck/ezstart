/**
 * User activity audit-log types — zero dependencies, zero framework coupling.
 */

// ---------------------------------------------------------------------------
// Audit log (user activity)
// ---------------------------------------------------------------------------

/**
 * Loggable user actions tracked by the audit log. New action types must be
 * appended here AND mirrored in the backend `AUDIT_LOG_ACTIONS` enum.
 */
export type AuditLogAction =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'email_change'
  | 'email_change_requested'
  | 'email_change_completed'
  | 'magic_link_requested'
  | 'magic_link_login'
  | 'oauth_link'
  | 'oauth_unlink'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_login_success'
  | '2fa_login_failed'
  | 'backup_code_used'
  | 'session_revoked'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'profile_updated'
  | 'account_locked_brute_force'
  | 'two_factor_locked_brute_force'

/** Free-form metadata recorded alongside an audit log entry. */
export interface AuditLogMetadata {
  ip?: string | null
  userAgent?: string | null
  location?: string | null
  [key: string]: unknown
}

/** A single audit log entry as returned by `GET /me/audit-log`. */
export interface AuditLogEntry {
  id: string
  userId: string
  appName: string
  action: AuditLogAction
  metadata: AuditLogMetadata
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 TTL deadline. */
  expiresAt: string
}

/** Filters accepted by the audit log listing endpoint. */
export interface AuditLogFilters {
  /** Page size (1–100). Defaults to 20 server-side. */
  limit?: number
  /** Pagination offset. Defaults to 0 server-side. */
  offset?: number
  /** Optional action type filter. */
  action?: AuditLogAction
}

/** Paginated list shape returned by the audit log endpoint. */
export interface AuditLogListResponse {
  items: AuditLogEntry[]
  total: number
  limit: number
  offset: number
}
