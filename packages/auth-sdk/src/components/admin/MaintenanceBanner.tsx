'use client'

/**
 * Platform-wide maintenance banner.
 *
 * Renders a sticky warning banner at the top of any consumer app when
 * platform-level maintenance is active. Fetches `/api/maintenance-status`
 * via `useMaintenanceStatus` (public, no auth required) and refreshes
 * every minute.
 */

import { useMemo } from 'react'
import { Div, Icon, P, Span } from '@ezstart/ui/components'
import { useMaintenanceStatus } from '../../react/maintenance-mode.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MaintenanceBannerTexts {
  /** Default banner heading prepended to the server-provided message. */
  heading: string
  /** Label for the "scheduled end" line, e.g. "Service resumes at". */
  scheduledEndLabel: string
  /** Tooltip / aria-label for the dismiss button (when `dismissible`). */
  dismissAriaLabel: string
}

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

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: MaintenanceBannerTexts = {
  heading: 'Scheduled maintenance in progress',
  scheduledEndLabel: 'Service expected to resume at',
  dismissAriaLabel: 'Dismiss banner',
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Renders the platform-wide maintenance banner when active.
 * Returns `null` when maintenance is disabled or status is loading.
 *
 * @example
 * ```tsx
 * // In a consumer app's root layout
 * <MaintenanceBanner apiUrl="https://auth.example.com" sticky />
 * ```
 */
export function MaintenanceBanner({
  apiUrl,
  texts,
  refetchIntervalMs,
  className,
  sticky = false,
}: MaintenanceBannerProps) {
  const t: MaintenanceBannerTexts = { ...DEFAULT_TEXTS, ...texts }
  const { data, isLoading } = useMaintenanceStatus({
    apiUrl,
    refetchIntervalMs,
  })

  const formattedEnd = useMemo(() => {
    if (!data?.scheduledEnd) return null
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.scheduledEnd))
    } catch {
      return null
    }
  }, [data?.scheduledEnd])

  if (isLoading || !data?.enabled) return null

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
          {data.message ? <P className="text-sm opacity-90">{data.message}</P> : null}
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
