'use client'

/**
 * Platform-wide maintenance banner — props-driven, zero data fetching.
 *
 * Renders a sticky warning banner at the top of any consumer app when
 * `status.enabled === true`. The consumer wires the data source —
 * typically `useMaintenanceStatus()` from `@ezstart/api-sdk/react` — and
 * passes the resolved status as a prop. Splitting the data layer (api-sdk)
 * from the presentation (ui) keeps this primitive reusable for any
 * status source (custom backend, env flag, feature flag service, ...).
 *
 * Originally lived in `@ezstart/auth-sdk` — moved here because the
 * presentation has zero auth coupling and is needed by every consumer app.
 */

import { useMemo } from 'react'
import { Div, P, Span } from '../tag'
import { Icon } from '../icon'

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Public maintenance status payload accepted by the banner.
 *
 * Mirrors `MaintenanceStatus` from `@ezstart/api-sdk/react` — duplicated
 * here so `@ezstart/ui` stays free of any SDK dependency. The two types
 * are structurally compatible and interchangeable.
 */
export interface MaintenanceBannerStatus {
  /** Whether maintenance mode is currently active. */
  enabled: boolean
  /** Banner message displayed to users (may be empty). */
  message?: string
  /** ISO datetime when maintenance was enabled, or null if disabled. */
  startedAt?: string | null
  /** Optional ISO datetime when maintenance is expected to end. */
  scheduledEnd?: string | null
}

export interface MaintenanceBannerTexts {
  /** Default banner heading prepended to the server-provided message. */
  heading: string
  /** Label for the "scheduled end" line, e.g. "Service resumes at". */
  scheduledEndLabel: string
  /** Tooltip / aria-label for the dismiss button (when `dismissible`). */
  dismissAriaLabel: string
}

export interface MaintenanceBannerProps {
  /**
   * Resolved maintenance status. Pass `null` while loading or when no
   * status is available — the banner renders nothing in that case so
   * consumers don't need a guard at the call site.
   */
  status: MaintenanceBannerStatus | null | undefined
  /** Override default English labels. */
  texts?: Partial<MaintenanceBannerTexts>
  /** Optional className appended to the root banner. */
  className?: string
  /**
   * When true, banner is rendered with `position: sticky; top: 0` so it
   * stays visible while users scroll. Defaults to `false` (rendered as a
   * normal block element — caller controls placement).
   */
  sticky?: boolean
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: MaintenanceBannerTexts = {
  heading: 'Scheduled maintenance in progress',
  scheduledEndLabel: 'Service expected to resume at',
  dismissAriaLabel: 'Dismiss banner',
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Renders the platform-wide maintenance banner when active.
 * Returns `null` when `status` is missing or `status.enabled === false`.
 *
 * @example
 * ```tsx
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
export function MaintenanceBanner({
  status,
  texts,
  className,
  sticky = false,
}: MaintenanceBannerProps) {
  const t: MaintenanceBannerTexts = { ...DEFAULT_TEXTS, ...texts }

  const formattedEnd = useMemo(() => {
    if (!status?.scheduledEnd) return null
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(status.scheduledEnd))
    } catch {
      return null
    }
  }, [status?.scheduledEnd])

  if (!status?.enabled) return null

  const classNames = [
    'w-full border-b border-warning/40 bg-warning/15 text-warning-foreground px-4 py-3 text-sm',
    sticky ? 'sticky top-0 z-50' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Div role="alert" aria-live="polite" className={classNames}>
      <Div className="mx-auto flex max-w-7xl items-start gap-3">
        <Icon name="lucide:AlertTriangle" className="mt-0.5 h-5 w-5 shrink-0" ariaHidden />
        <Div className="flex-1 space-y-1">
          <P className="font-medium">{t.heading}</P>
          {status.message ? <P className="text-sm opacity-90">{status.message}</P> : null}
          {formattedEnd ? (
            <P className="text-xs opacity-80">
              {t.scheduledEndLabel}: <Span className="font-mono">{formattedEnd}</Span>
            </P>
          ) : null}
        </Div>
      </Div>
    </Div>
  )
}
