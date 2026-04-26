import '@ezstart/ui/globals.css'
import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { getWebUrl } from '@ezstart/config'
import { Providers } from '@/components/providers'
import { ErrorBoundary, Toaster } from '@ezstart/ui/components'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import Script from 'next/script'
import { headers } from 'next/headers'
import { ReactNode } from 'react'
import { resolveSsrTheme, renderThemeStyle } from '@/server/theme-ssr'

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

  return (
    <html lang={locale} suppressHydrationWarning data-app="ezauth">
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
            <Providers>{children}</Providers>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
