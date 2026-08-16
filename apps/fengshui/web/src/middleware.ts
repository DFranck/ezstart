// apps/fengshui/web/middleware.ts
import { createAuthMiddleware } from '@ezstart/auth-sdk'
import { getWebUrl } from '@ezstart/config'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Create i18n middleware — required for next-intl to resolve URL-based locale
// (e.g. `/en`, `/es`) and rewrite requests into the matching `[locale]` segment.
// Also redirects bare `/` to the default locale (`/fr`) instead of 404.
// Without this, `requestLocale` falls back to the default locale and every page
// renders French regardless of the URL prefix.
const intlMiddleware = createIntlMiddleware(routing)

export default createAuthMiddleware({
  appName: 'fengshui',
  authMode: 'httpOnly',
  ezauthUrl: getWebUrl('ezauth'),
  protectedPaths: ['/dashboard'],
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  intlMiddleware,
})

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
