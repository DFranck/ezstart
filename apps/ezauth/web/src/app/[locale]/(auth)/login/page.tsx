/**
 * Server wrapper for `/login` — reads the middleware-resolved app name from
 * the `x-app-theme` header and passes it down as a prop so the initial
 * render already matches the consumer brand. This eliminates the transient
 * "Sign in to access EZAuth" flash that used to appear before the client
 * `useKeyConfig` probe completed.
 */

import { headers } from 'next/headers'
import { resolveSsrTheme } from '@/server/theme-ssr'
import LoginClient from './LoginClient'

export default async function LoginPage() {
  const h = await headers()
  const { appName } = resolveSsrTheme(h)
  // `resolveSsrTheme` returns `'ezauth'` when no consumer key was detected.
  // Only forward the value when it points to a real consumer app — otherwise
  // the client fallback chain (`navigation.app ?? 'ezauth'`) handles it.
  const ssrAppName = appName && appName !== 'ezauth' ? appName : null
  return <LoginClient ssrAppName={ssrAppName} />
}
