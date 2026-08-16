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
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const API_URL = process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'

/**
 * Resolve the app slug from a publishable key via `/api/keys/config`.
 * Returns `null` when the key is invalid, rate-limited, or unreachable.
 */
async function resolveAppFromKey(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/keys/config?key=${encodeURIComponent(key)}`)
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { appName?: string } }
    const appName = json.data?.appName
    return typeof appName === 'string' && appName.length > 0 && appName !== '*' ? appName : null
  } catch {
    return null
  }
}

/**
 * Issue an SSO handoff code for an already-authenticated user landing on
 * `/login?redirect_uri=...&(app|key)=...` (cross-app SSO context, e.g. consumer
 * app clicked `<LoginButton>` while user already had a valid ezauth session).
 *
 * Forwards the SSR cookie to the api, fetches a CSRF token, then POSTs to
 * `/api/auth/sso/authorize`. Returns the auth code on success or `null` on
 * any failure (caller falls back to rendering the login form).
 *
 * Why server-side : avoids a flash where the LoginClient briefly renders the
 * form before the client-side SSO bounce. Mirrors the SSR `getServerAuth`
 * pattern used elsewhere.
 */
async function issueSsoCode(
  cookieHeader: string,
  app: string,
  redirectUri: string
): Promise<string | null> {
  try {
    // 1. Fetch CSRF token (sets csrf-token cookie + returns X-CSRF-Token header)
    const csrfRes = await fetch(`${API_URL}/api/auth/login-cookie/csrf`, {
      headers: { cookie: cookieHeader },
    })
    if (!csrfRes.ok) return null
    const csrfToken = csrfRes.headers.get('x-csrf-token')
    if (!csrfToken) return null
    // 2. Forward the csrf-token Set-Cookie back so the next call carries it.
    const csrfSetCookie = csrfRes.headers.get('set-cookie') ?? ''
    const mergedCookie = csrfSetCookie
      ? `${cookieHeader}; ${csrfSetCookie.split(';')[0]}`
      : cookieHeader

    // 3. POST sso/authorize
    const authRes = await fetch(`${API_URL}/api/auth/sso/authorize`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: mergedCookie,
      },
      body: JSON.stringify({ app, redirectUri }),
    })
    if (!authRes.ok) return null
    const json = (await authRes.json()) as { data?: { code?: string } }
    return json.data?.code ?? null
  } catch {
    return null
  }
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params
  const sp = await searchParams
  const h = await headers()
  const cookieHeader = h.get('cookie') ?? undefined

  const initialUser = await getServerAuth({
    apiUrl: API_URL,
    cookieHeader,
  })

  // Cross-app SSO handoff: when an already-authenticated user lands here with
  // `?redirect_uri=...&(app|key)=...` (consumer app clicked `<LoginButton>`), the
  // expected flow is to silently issue an auth code and bounce to the consumer
  // callback — NOT to render the login form (annoying re-login) and NOT to
  // redirect to the local /dashboard (loses the consumer's redirect_uri).
  // The SDK passes either `?app=` (first-party mode, no key) or `?key=` (the
  // canonical Clerk-like publishable-key mode) — we resolve the app slug from
  // the key via `/api/keys/config` when only key is present.
  // Falls through to the regular flow if SSO code issuance fails.
  if (initialUser && cookieHeader) {
    const redirectUri = typeof sp.redirect_uri === 'string' ? sp.redirect_uri : undefined
    const appParam = typeof sp.app === 'string' ? sp.app : undefined
    const keyParam = typeof sp.key === 'string' ? sp.key : undefined
    if (redirectUri) {
      const app = appParam ?? (keyParam ? await resolveAppFromKey(keyParam) : null)
      if (app) {
        const code = await issueSsoCode(cookieHeader, app, redirectUri)
        if (code) {
          const target = new URL(redirectUri)
          target.searchParams.set('code', code)
          redirect(target.toString())
        }
      }
    }
  }

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
