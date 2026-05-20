/**
 * Localhost-host detection for the `<AuthProvider>` auth-mode resolver.
 *
 * Extracted from `auth-provider.tsx` (Wave D Lot 4). Behaviour unchanged.
 *
 * @internal
 * @module @ezstart/auth-sdk/react/auth-provider/localhost
 */

/**
 * `true` when the current browser is running on a localhost-equivalent host
 * (`localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`, `*.localhost`). The dev
 * stack always uses localStorage because the API and the web app run on
 * different ports of the same host, and host-only cookies can't span ports.
 */
export function isLocalhostBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host === '::1'
  )
}
