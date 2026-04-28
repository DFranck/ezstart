// apps/ezauth/web/src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { fetchKeyConfigCached } from './server/key-config-cache'

/** Allowed app values for legacy `?app=` theme scoping */
const VALID_APPS = new Set(['ezauth', 'ezstart', 'ezbill', 'ezpay', 'green-pulse', 'fengshui'])

/**
 * Valid `?theme=` values forwarded from a consumer app. Matches the values
 * accepted by `next-themes` (`light`, `dark`, `system`) — anything else is
 * rejected silently so a malicious caller can't inject arbitrary text into
 * the cookie (the cookie is read by next-themes without further
 * validation, so defense-in-depth is worth it).
 */
const VALID_THEME_PREFERENCES = new Set(['light', 'dark', 'system'])

/**
 * Name of the cookie `next-themes` reads by default. If the consumer
 * customised `ThemeProvider` with a non-default `storageKey`, this needs
 * to be kept in sync (ezauth uses the default today).
 */
const THEME_COOKIE_NAME = 'theme'

/**
 * Path fragments that render their own full-screen chrome (auth forms,
 * dashboard, admin, developer, account). Matched via `pathname.includes(...)`
 * so locale-prefixed URLs (`/en/login`, `/fr/dashboard`, etc.) hit without
 * per-locale entries.
 *
 * Mirrors `BARE_PREFIXES` in `components/app-shell.tsx`. The middleware
 * injects `x-route-mode: bare | full` based on this list so the layout can
 * decide chrome rendering SSR-correctly (no client `usePathname()` swap).
 */
// Auth routes (`/login`, `/register`, etc.) are intentionally NOT bare:
// they render an empty page + a `<SignInModal>` (etc.) portal, so we want
// the public landing chrome (header + footer) visible BEHIND the modal
// backdrop — Vercel / Linear "intercepted modal" pattern. Closing the
// modal navigates back to home with chrome already in place (no flash).
//
// `/components` is bare even though it lives in the `(public)` route group:
// the showcase ships its own `<DashboardLayout>` (sidebar + content) chrome
// and we don't want it double-framed by the public AppShell header/footer.
const BARE_ROUTE_PREFIXES = [
  '/auth/',
  '/dashboard',
  '/admin',
  '/developer',
  '/account',
  '/components',
]

function isBareRoutePathname(pathname: string): boolean {
  return BARE_ROUTE_PREFIXES.some(prefix => pathname.includes(prefix))
}

const intlMiddleware = createMiddleware(routing)

/**
 * Resolve the EZAuth API URL used to fetch `/keys/config` during SSR. We read
 * the public env var (same source the client uses) and fall back to
 * `http://localhost:6110` in dev.
 */
function resolveApiUrl(): string {
  return process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'
}

export default async function middleware(request: NextRequest) {
  // Health check endpoint — returns 200 immediately for monitoring
  if (request.nextUrl.pathname === '/health') {
    return new NextResponse('OK', { status: 200 })
  }

  // Bare-route detection (SSR-correct chrome decision). Layout reads this
  // header via `headers().get('x-route-mode')` and short-circuits the
  // `<AppShell>` chrome on auth/dashboard/admin/etc. routes — eliminating the
  // landing-chrome flash that used to happen on `/dashboard` direct loads
  // (where the client `usePathname()` only ran post-hydration).
  const routeMode = isBareRoutePathname(request.nextUrl.pathname) ? 'bare' : 'full'
  request.headers.set('x-route-mode', routeMode)

  // Resolve app theme from URL params.
  // ?key= (publishable key) takes priority over ?app= (legacy).
  const keyParam = request.nextUrl.searchParams.get('key')
  const appParam = request.nextUrl.searchParams.get('app')?.toLowerCase()
  // `?theme=light|dark|system` — propagated from the consumer app via
  // <LoginButton>/<RegisterButton>. Cascades to a cookie read by next-themes
  // on the next render pass so the ezauth auth pages match the consumer's
  // current scheme out of the box (no flash, no manual sync).
  const themeParam = request.nextUrl.searchParams.get('theme')
  const validThemePreference =
    themeParam && VALID_THEME_PREFERENCES.has(themeParam) ? themeParam : undefined

  // Mutate the incoming request's headers so server components reading
  // `headers()` during the render pass see our custom `x-app-*` keys. This
  // is how both next-intl and the existing ezauth middleware propagate
  // request-scoped data to RSC.
  if (keyParam) {
    request.headers.set('x-publishable-key', keyParam)

    // Try to resolve the owning Application + theme synchronously during SSR
    // so the first-render paint is already white-labeled (zero flash). Any
    // failure here is non-fatal — the client-side `useKeyConfig` hook will
    // reconcile the theme after hydration.
    try {
      const config = await fetchKeyConfigCached(keyParam, resolveApiUrl())
      if (config) {
        request.headers.set('x-app-theme', config.appName)
        if (config.appDisplayName) {
          request.headers.set('x-app-display-name', config.appDisplayName)
        }
        if (config.theme) {
          // Stringify only the minimal token set — drops undefined keys so
          // the header stays small and predictable.
          request.headers.set('x-app-theme-tokens', JSON.stringify(config.theme))
        }
      }
    } catch {
      // Swallow — middleware must not block render. Client hook will recover.
    }
  } else if (appParam) {
    // Legacy ?app= fallback for first-party mode
    const validApp = VALID_APPS.has(appParam) ? appParam : undefined
    if (validApp) {
      request.headers.set('x-app-theme', validApp)
    }
  }

  // next-intl middleware handles locale routing. Capture its response so we
  // can attach the theme cookie to it before returning.
  const response = intlMiddleware(request)

  // Propagate the consumer's light/dark preference by writing next-themes'
  // cookie on the response. This is picked up on the NEXT render pass, so a
  // fresh navigation to `/login?theme=dark` already paints in dark mode
  // (zero flash). We keep the cookie scoped to `/` with `SameSite=Lax` so it
  // works for the OAuth redirect flow (cross-site top-level navigation is
  // still considered same-site for SameSite=Lax).
  //
  // When the consumer later switches scheme on the ezauth page via the
  // `<ThemeSwitcher>`, next-themes writes the same cookie itself —
  // overwriting our middleware-set value cleanly.
  //
  // ALSO inject `x-theme-preference` request header so the SSR layout can
  // read the preference SYNCHRONOUSLY on this very render (no roundtrip
  // through the cookie + client-side script). This is what kills the FOWT
  // (Flash of Wrong Theme) on cross-app SSO redirects: with the header
  // present, the layout emits `<html class="dark">` directly in the SSR
  // payload, so the very first paint already matches the consumer.
  if (validThemePreference) {
    response.cookies.set(THEME_COOKIE_NAME, validThemePreference, {
      path: '/',
      sameSite: 'lax',
      // No `Secure` flag — cookie must be readable in dev (http://localhost).
      // Next-themes reads cookies JS-side, so `HttpOnly` is never set.
      maxAge: 60 * 60 * 24 * 365, // 1 year, matches next-themes default
    })
    request.headers.set('x-theme-preference', validThemePreference)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
