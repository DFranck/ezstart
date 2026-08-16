'use client'

import { useEffect, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Minimal logger contract — silent no-op by default. Pass a real logger
 * (Pino, console, Sentry breadcrumb wrapper) via the `logger` prop to
 * surface render / script-injection errors in dev tools.
 */
export interface TurnstileWidgetLogger {
  warn: (msg: string, data?: unknown) => void
}

const SILENT_LOGGER: TurnstileWidgetLogger = {
  warn: () => {},
}

export interface TurnstileWidgetProps {
  /**
   * Cloudflare Turnstile site key (public). When empty/undefined, the
   * widget renders nothing (no-op). This lets consumers ship without
   * captcha and enable it later by setting an env var like
   * `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
   */
  siteKey?: string
  /**
   * Called when the user successfully completes the challenge. The
   * received `token` MUST be sent to the backend (typically as
   * `body.turnstileToken`) for verification via Cloudflare's
   * `/siteverify` endpoint.
   */
  onSuccess: (token: string) => void
  /** Called when the challenge errors out (network / config issue). */
  onError?: (err: unknown) => void
  /** Called when the obtained token expires (Cloudflare requires re-challenge). */
  onExpired?: () => void
  /** Visual theme. Default `'auto'` (follows OS preference). */
  theme?: 'light' | 'dark' | 'auto'
  /**
   * Render mode controlling widget visibility:
   * - `'always'` — always show the challenge UI
   * - `'execute'` — only run when triggered programmatically
   * - `'interaction-only'` (default) — invisible unless interaction is required
   */
  appearance?: 'always' | 'execute' | 'interaction-only'
  /** Optional className for the container `<div>`. */
  className?: string
  /**
   * Optional logger to surface render / script-injection failures in dev
   * tools. Silent no-op by default to avoid coupling to any monorepo
   * logger package.
   */
  logger?: TurnstileWidgetLogger
}

// ─── Cloudflare Turnstile global typing ────────────────────────────────────

interface TurnstileGlobal {
  render: (
    container: HTMLElement,
    opts: {
      sitekey: string
      callback?: (token: string) => void
      'error-callback'?: (err: unknown) => void
      'expired-callback'?: () => void
      theme?: 'light' | 'dark' | 'auto'
      appearance?: 'always' | 'execute' | 'interaction-only'
    }
  ) => string
  remove: (id: string) => void
  reset: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal
    onloadTurnstileCallback?: () => void
  }
}

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback'

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Cloudflare Turnstile captcha widget — invisible when `siteKey` is empty.
 *
 * Renders nothing when no `siteKey` is provided so apps can ship without
 * captcha and enable it later by populating `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
 * (or any equivalent env var).
 *
 * The Cloudflare script is injected once per page (idempotent). The widget
 * is created on mount and removed on unmount; both calls are wrapped in
 * `try/catch` per `standard-sdk-dx.md` §11bis to survive HMR / StrictMode
 * unmounts and missing Cloudflare globals.
 *
 * @example
 *   <TurnstileWidget
 *     siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
 *     onSuccess={(token) => setTurnstileToken(token)}
 *   />
 */
export function TurnstileWidget({
  siteKey,
  onSuccess,
  onError,
  onExpired,
  theme = 'auto',
  appearance = 'interaction-only',
  className,
  logger = SILENT_LOGGER,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!siteKey || typeof window === 'undefined' || !containerRef.current) {
      return
    }

    const renderWidget = () => {
      const container = containerRef.current
      if (!container || !window.turnstile) return
      try {
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: onSuccess,
          'error-callback': onError,
          'expired-callback': onExpired,
          theme,
          appearance,
        })
      } catch (err) {
        logger.warn('[turnstile] render failed', err)
        onError?.(err)
      }
    }

    // Inject script once per page
    if (!window.turnstile) {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      )
      if (!existing) {
        try {
          const script = document.createElement('script')
          script.src = TURNSTILE_SCRIPT_URL
          script.async = true
          script.defer = true
          document.head.appendChild(script)
        } catch (err) {
          logger.warn('[turnstile] script injection failed', err)
          onError?.(err)
          return
        }
      }
      // Cloudflare invokes this global once the script has loaded
      window.onloadTurnstileCallback = renderWidget
    } else {
      renderWidget()
    }

    return () => {
      const id = widgetIdRef.current
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id)
        } catch {
          // HMR / StrictMode unmount may invalidate the handle — non-fatal
        }
      }
      widgetIdRef.current = null
    }
  }, [siteKey, onSuccess, onError, onExpired, theme, appearance, logger])

  if (!siteKey) return null
  return <div ref={containerRef} className={className} />
}
