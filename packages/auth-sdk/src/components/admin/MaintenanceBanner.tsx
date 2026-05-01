'use client'

/**
 * @deprecated MaintenanceBanner moved to a split architecture (2026-05-01):
 * - Hook: `useMaintenanceStatus` from `@ezstart/api-sdk/react` (data layer)
 * - UI:   `MaintenanceBanner` from `@ezstart/ui/components` (presentation)
 *
 * This re-export keeps the old single-component API working for 90 days
 * (planned removal 2026-08-01). Migration:
 *
 * ```tsx
 * // before
 * import { MaintenanceBanner } from '@ezstart/auth-sdk/components'
 * <MaintenanceBanner apiUrl="https://api.example.com" sticky />
 *
 * // after
 * import { useMaintenanceStatus } from '@ezstart/api-sdk/react'
 * import { MaintenanceBanner } from '@ezstart/ui/components'
 *
 * function PlatformShell({ children }) {
 *   const { data } = useMaintenanceStatus({ apiUrl: 'https://api.example.com' })
 *   return (
 *     <>
 *       <MaintenanceBanner status={data ?? null} sticky />
 *       {children}
 *     </>
 *   )
 * }
 * ```
 */

import {
  MaintenanceBanner as UIMaintenanceBanner,
  type MaintenanceBannerTexts as UIMaintenanceBannerTexts,
} from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import { useMaintenanceStatus } from '@ezstart/api-sdk/react'

// ─── Types (backward-compat surface) ────────────────────────────────────────

/**
 * @deprecated Re-export of `MaintenanceBannerTexts` from `@ezstart/ui/components`.
 * Kept so existing consumer imports keep compiling.
 */
export type MaintenanceBannerTexts = UIMaintenanceBannerTexts

export interface MaintenanceBannerProps {
  /** Override the EZAuth API base URL. Required for cross-origin consumers. */
  apiUrl?: string
  /** Override default English labels. */
  texts?: Partial<MaintenanceBannerTexts>
  /** Polling interval in ms. Defaults to 60_000 (1 minute). */
  refetchIntervalMs?: number
  /** Optional className appended to the root banner. */
  className?: string
  /**
   * When true, banner is rendered with `position: sticky; top: 0` so it stays
   * visible while users scroll. Defaults to `false` (rendered as a normal
   * block element — caller controls placement).
   */
  sticky?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * @deprecated Use `useMaintenanceStatus` (`@ezstart/api-sdk/react`) +
 * `MaintenanceBanner` (`@ezstart/ui/components`) instead. Will be removed
 * 2026-08-01. See module-level JSDoc for the migration snippet.
 */
export function MaintenanceBanner({
  apiUrl,
  texts,
  refetchIntervalMs,
  className,
  sticky = false,
}: MaintenanceBannerProps) {
  useDeprecationWarning(
    'MaintenanceBanner from @ezstart/auth-sdk',
    'compose useMaintenanceStatus (@ezstart/api-sdk/react) + MaintenanceBanner (@ezstart/ui/components)'
  )

  // The hook in api-sdk REQUIRES an explicit apiUrl (no monorepo-magic
  // resolution). The legacy auth-sdk component allowed `apiUrl` to be
  // optional, defaulting to whatever the bound `@ezstart/api-sdk` client
  // resolved for `appName: 'ezauth'`. We preserve that ergonomic by
  // falling back to the public env var when the consumer omits the prop.
  const resolvedApiUrl =
    apiUrl ??
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_EZAUTH_API_URL : undefined) ??
    ''

  const { data } = useMaintenanceStatus({
    apiUrl: resolvedApiUrl,
    ...(refetchIntervalMs !== undefined ? { refetchIntervalMs } : {}),
    enabled: resolvedApiUrl.length > 0,
  })

  return (
    <UIMaintenanceBanner
      status={data ?? null}
      {...(texts !== undefined ? { texts } : {})}
      {...(className !== undefined ? { className } : {})}
      sticky={sticky}
    />
  )
}

MaintenanceBanner.displayName = 'MaintenanceBanner'
