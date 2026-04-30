'use client'

/**
 * Idle warning toast helper.
 *
 * Surfaced by `useIdleTimeout` ~60s before the auto-logout fires. The toast
 * shows a live countdown ("You'll be signed out in {seconds}s due to
 * inactivity.") with a "Stay signed in" CTA that resets the idle timer.
 *
 * Texts are props-driven with English defaults so the SDK never depends on
 * `next-intl` (cf. standard-sdk-dx.md §9). The consumer wires localized
 * strings via `<AuthProvider idleWarningTexts={...}>`.
 */

import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Texts
// ---------------------------------------------------------------------------

/**
 * User-facing labels for the idle warning toast and the post-logout
 * inactivity message. Pass localized strings via
 * `<AuthProvider idleWarningTexts={...}>` or per-call.
 */
export interface IdleWarningTexts {
  /** Toast title (sonner heading). */
  title: string
  /**
   * Toast body. Use the `{seconds}` placeholder for the live countdown —
   * the helper does a literal `String.replace()` so every other character is
   * left untouched.
   */
  description: string
  /** Label of the "stay signed in" CTA button. */
  stayButton: string
  /** Toast surfaced AFTER the auto-logout fires. */
  signedOutMessage: string
}

/** English defaults — re-exported so consumers can import as a starting point. */
export const defaultIdleWarningTexts: IdleWarningTexts = {
  title: 'About to sign out',
  description: "You'll be signed out in {seconds}s due to inactivity.",
  stayButton: 'Stay signed in',
  signedOutMessage: 'Signed out due to inactivity',
}

// ---------------------------------------------------------------------------
// Toast helpers
// ---------------------------------------------------------------------------

/** Stable toast id so the warning can be updated / dismissed in place. */
const IDLE_WARNING_TOAST_ID = 'ezauth-idle-warning'

export interface ShowIdleWarningOptions {
  /** Remaining time before auto-logout, in milliseconds. */
  remainingMs: number
  /** Called when the user clicks the "stay signed in" CTA. */
  onStay: () => void
  /** Toast labels (defaults to {@link defaultIdleWarningTexts}). */
  texts?: IdleWarningTexts
  /**
   * When true, do NOT update the description string (the consumer respects
   * `prefers-reduced-motion`). The toast is still shown with the initial
   * countdown, but no per-second tick happens.
   */
  reducedMotion?: boolean
}

/**
 * Format the description by interpolating the `{seconds}` placeholder.
 * Exported for tests; internal otherwise.
 *
 * @internal
 */
export function formatIdleDescription(template: string, seconds: number): string {
  return template.replace('{seconds}', String(Math.max(0, Math.ceil(seconds))))
}

/**
 * Show (or refresh) the idle warning toast. Uses a stable toast id so
 * repeated calls update the same toast in place — no toast spam during the
 * countdown.
 *
 * Defensive: every sonner / toast layer failure is swallowed (no-op). The
 * toast is a UX hint — the underlying timer logic must keep running even
 * if the browser refuses to render the toast.
 */
export function showIdleWarning(opts: ShowIdleWarningOptions): void {
  const texts = opts.texts ?? defaultIdleWarningTexts
  const seconds = Math.max(0, Math.ceil(opts.remainingMs / 1000))
  const description = formatIdleDescription(texts.description, seconds)

  try {
    toast.warning(texts.title, {
      id: IDLE_WARNING_TOAST_ID,
      description,
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: texts.stayButton,
        onClick: () => {
          try {
            opts.onStay()
          } catch {
            // Non-fatal — caller's onStay must never break the toast UX.
          }
          dismissIdleWarning()
        },
      },
    })
  } catch {
    // Sonner unavailable (SSR / older bundle) — silently degrade. The
    // auto-logout still fires; the user simply doesn't see the warning.
  }
}

/** Dismiss the idle-warning toast (no-op if absent). */
export function dismissIdleWarning(): void {
  try {
    toast.dismiss(IDLE_WARNING_TOAST_ID)
  } catch {
    // Same defensive posture as showIdleWarning.
  }
}

/**
 * Show the post-logout "signed out due to inactivity" toast. Called by
 * `useIdleTimeout` after the canonical logout flow completes.
 */
export function showIdleSignedOutToast(texts?: IdleWarningTexts): void {
  const resolved = texts ?? defaultIdleWarningTexts
  try {
    toast.info(resolved.signedOutMessage)
  } catch {
    // Defensive — same as above.
  }
}
