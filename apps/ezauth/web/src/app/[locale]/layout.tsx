import '@ezstart/ui/globals.css'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { getWebUrl } from '@ezstart/config'
import { Providers } from '@/components/providers'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import Script from 'next/script'
import { cookies, headers } from 'next/headers'
import { ReactNode } from 'react'
import { resolveSsrTheme, renderThemeStyle } from '@/server/theme-ssr'

/**
 * Resolve the user's resolved scheme (`'dark' | 'light' | undefined`) for
 * SSR-side className injection on `<html>`. Combines two sources, in order:
 *
 * 1. `x-theme-preference` request header — set by middleware when the URL
 *    contains `?theme=light|dark|system`. Wins on cross-app SSO redirects
 *    (consumer just sent us the preference for THIS request).
 * 2. `theme` cookie — written by next-themes after the user toggled scheme
 *    on a previous ezauth page, OR by middleware on a previous request.
 *    Used for in-app navigations where no `?theme=` is present.
 *
 * Returns `undefined` when the value is `'system'` or absent — the inline
 * next-themes blocking script will then resolve via `prefers-color-scheme`.
 * We intentionally do NOT try to second-guess the OS preference server-side
 * (we can't read it) — a brief FOIT (flash of initial theme = unstyled root)
 * is acceptable when the user has expressed no preference; what we are
 * killing is FOWT (Flash of Wrong Theme), which happens when we DO know the
 * preference but render with the wrong default.
 */
async function resolveSsrThemeClass(): Promise<'dark' | undefined> {
  const headersList = await headers()
  const cookieStore = await cookies()
  const fromHeader = headersList.get('x-theme-preference')
  const fromCookie = cookieStore.get('theme')?.value
  const value = fromHeader ?? fromCookie
  return value === 'dark' ? 'dark' : undefined
}

const DOMAIN = getWebUrl('ezauth', 'production')

export const metadata = createMetadata({
  appName: 'EZAuth',
  description:
    'EZStart centralized authentication service - Secure SSO for all EZStart applications',
  domain: DOMAIN,
  keywords: ['authentication', 'SSO', 'OAuth2', 'login', 'ezstart'],
  themeColor: '#00D9F7',
  ogImage: `${DOMAIN}/og-image.svg`,
})

export const viewport = createViewport('#00D9F7')

const jsonLd = createJsonLd({
  appName: 'EZAuth',
  description:
    'EZStart centralized authentication service - Secure SSO for all EZStart applications',
  url: DOMAIN,
  applicationCategory: 'BusinessApplication',
})

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  const messages = await getMessages()
  const t = await getTranslations({ locale })

  // Read app theme + tokens set by middleware from ?app= or ?key= search
  // params. Injects the per-tenant `--primary` override inline so the
  // first-render paint is already white-labeled (zero flash for EZAuth Pro
  // tenants).
  //
  // `data-app` is intentionally FIXED to `"ezauth"` on the `<html>` root:
  // ezauth's own theme CSS is always the baseline, and the DB theme
  // override only touches `--primary` via a bare `:root{}` rule. This kills
  // the old hardcoded per-app CSS coupling (`<html data-app="green-pulse">`
  // inheriting `green-pulse.css`) — the DB is now the single source of
  // truth for white-label styling on auth pages.
  const headersList = await headers()
  const { appName: ssrAppName, theme: ssrTheme } = resolveSsrTheme(headersList)
  const themeCss = renderThemeStyle(ssrAppName, ssrTheme)

  // SSR theme class — kills FOWT on cross-app SSO redirects. When the
  // consumer sends `?theme=dark`, the middleware injects the
  // `x-theme-preference` header on this request and we paint `<html
  // class="dark">` directly in the SSR payload. next-themes' blocking
  // script still runs after hydration and reconciles localStorage; with
  // `suppressHydrationWarning` set on `<html>`, any divergence is silenced
  // (the script's reconciliation is the source of truth post-hydration).
  const ssrThemeClass = await resolveSsrThemeClass()

  // SSR auth bootstrap (Clerk-style) — kills the LoginButton flash in
  // httpOnly mode. Reads the session cookie from the inbound request,
  // resolves the user via `/api/auth/me` server-side, and seeds the Zustand
  // store synchronously when `<AuthProvider>` mounts (via `initialUser`).
  // The first paint of `<UserMenu>` / `<LoginButton>` / `<RequireAuth>` then
  // reflects the right state — no async client-side gap during which the
  // store defaults to `isAuthenticated: false`. Anonymous requests still
  // work: `getServerAuth()` returns `null` and the legacy client-side
  // bootstrap takes over.
  const cookieHeader = headersList.get('cookie')
  const initialUser = await getServerAuth({
    apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110',
    cookieHeader,
    logger,
  })

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-app="ezauth"
      data-scroll-behavior="smooth"
      className={ssrThemeClass}
    >
      <head>
        {/*
          Sync the `theme` cookie (written by middleware from `?theme=` URL
          param on cross-origin login redirects) into `localStorage` BEFORE
          next-themes' own blocking script reads storage. Without this, the
          consumer's preference never reaches next-themes (which reads only
          localStorage, not cookies) and ezauth renders its own stored scheme
          instead of matching the consumer. The cookie is consumed on read so
          subsequent navigations don't keep resetting the user's preference.

          Wrapped in `next/script` with `beforeInteractive` strategy so Next.js
          (Turbopack 15.5+) controls insertion order relative to its injected
          polyfills (`polyfill-nomodule.js`). A bare `<script>` in `<head>`
          collides with that polyfill at the same DOM slot and triggers a
          hydration mismatch on reload.
        */}
        <Script
          id="theme-cookie-sync"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);if(!m)return;var v=decodeURIComponent(m[1]);if(v==='light'||v==='dark'||v==='system'){if(localStorage.getItem('theme')!==v){localStorage.setItem('theme',v);}document.cookie='theme=; path=/; max-age=0; SameSite=Lax';}}catch(e){}})()",
          }}
        />
        {themeCss ? (
          <style
            id="ezauth-tenant-theme"
            // The inline CSS is built from a narrow allow-list of tokens
            // validated by `isSafeCssValue` — `<`, `{`, `}`, `;` are rejected
            // so `dangerouslySetInnerHTML` is safe here.
            dangerouslySetInnerHTML={{ __html: themeCss }}
          />
        ) : null}
      </head>
      <body className="min-h-screen">
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ErrorBoundary title={t('errorBoundary.title')}>
            {/*
              Root layout owns ONLY providers (NextIntl + ErrorBoundary +
              ThemeProvider + AuthProvider via <Providers>). The page chrome
              (AppShell for marketing, DashboardLayout for app, bare for
              focused tasks) is owned by each ROUTE GROUP layout in
              `(public)/`, `(app)/`, `(auth)/`, `(bare)/`.
              Pattern Stripe / Clerk / Vercel — keeps each surface focused
              on its concern, eliminates conditional chrome short-circuits,
              and lets Next.js naturally re-render the right shell on
              cross-group navigation (no stale routeMode cache).
            */}
            <Providers initialUser={initialUser}>{children}</Providers>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
