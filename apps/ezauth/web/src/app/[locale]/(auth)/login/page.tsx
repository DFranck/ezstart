/**
 * Server wrapper for `/login` — reads the middleware-resolved app name and
 * display name from the SSR headers and passes them down as props so the
 * initial render already matches the consumer brand. This eliminates the
 * transient "Sign in to access EZAuth" flash that used to appear before the
 * client `useKeyConfig` probe completed.
 *
 * Also performs an SSR redirect to `/{locale}/dashboard` when the user is
 * already authenticated (cookie session valid). This kills the flash where
 * the login form briefly renders before the client-side effect bounces the
 * user away.
 */

import { getServerAuth } from '@ezstart/auth-sdk/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveSsrTheme } from '@/server/theme-ssr'
import LoginClient from './LoginClient'

interface LoginPageProps {
  params: Promise<{ locale: string }>
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params
  const h = await headers()
  const cookieHeader = h.get('cookie') ?? undefined

  const initialUser = await getServerAuth({
    apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110',
    cookieHeader,
  })

  if (initialUser) {
    redirect(`/${locale}/dashboard`)
  }

  const { appName, appDisplayName } = resolveSsrTheme(h)
  // `resolveSsrTheme` returns `'ezauth'` when no consumer key was detected.
  // Only forward the value when it points to a real consumer app — otherwise
  // the client fallback chain (`navigation.app ?? 'ezauth'`) handles it.
  const ssrAppName = appName && appName !== 'ezauth' ? appName : null
  const ssrAppDisplayName = appDisplayName ?? null
  return <LoginClient ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
}
