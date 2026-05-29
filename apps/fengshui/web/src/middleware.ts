// apps/fengshui/web/middleware.ts
import { createAuthMiddleware } from '@ezstart/auth-sdk'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Create i18n middleware — required for next-intl to redirect `/` to the
// default locale (`/fr`) and resolve URL-based locales (`/en`, `/es`).
// Without it, `/` falls through to next() and 404s (no locale segment).
const intlMiddleware = createIntlMiddleware(routing)

export default createAuthMiddleware({
  appName: 'fengshui',
  authMode: 'httpOnly',
  protectedPaths: ['/dashboard'],
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  intlMiddleware,
})

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
