'use client'

import { useEffect } from 'react'

/**
 * Dynamically updates `<html data-app="...">` to match the resolved consumer
 * app name on the client, so the per-app theme CSS (`:root[data-app='ezpay']`,
 * etc.) kicks in for white-labeled auth pages.
 *
 * Why this hook exists — the root `<html data-app>` attribute is set at SSR
 * time from the `x-app-theme` middleware header. That header is only populated
 * when the URL uses the legacy `?app=<name>` param; requests arriving via a
 * publishable `?key=<ez_pk_live_...>` param leave the header undefined, so
 * SSR falls back to `data-app="ezauth"` and the consumer's theme never
 * applies visually, even though the page title / brand copy are correct.
 *
 * This hook re-syncs the attribute on the client once `useKeyConfig` has
 * resolved the real `appName`, and restores the previous value on unmount
 * (e.g. when the user navigates to their dashboard after login, so the
 * ezauth default theme is restored).
 *
 * @param app - Resolved app name (e.g. `'ezpay'`). No-op when `undefined`.
 */
export function useDynamicAppTheme(app: string | undefined): void {
  useEffect(() => {
    if (!app) return
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const previous = root.getAttribute('data-app')

    // Skip if already in sync — avoids a needless attribute mutation that
    // can invalidate downstream CSS transitions.
    if (previous === app) return

    root.setAttribute('data-app', app)

    return () => {
      if (previous !== null) {
        root.setAttribute('data-app', previous)
      } else {
        root.removeAttribute('data-app')
      }
    }
  }, [app])
}
