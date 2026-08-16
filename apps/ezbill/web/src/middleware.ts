import { createAuthMiddleware } from '@ezstart/auth-sdk'
import { getWebUrl } from '@ezstart/config'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Create i18n middleware
const intlMiddleware = createIntlMiddleware(routing)

// Create auth middleware with auto-detection
// - localhost: Automatically uses localStorage mode (no middleware checks)
// - production *.ezstart.xyz: Uses httpOnly cookies
// - external domains: Falls back to localStorage with warning
export default createAuthMiddleware({
  appName: 'ezbill',
  authMode: 'httpOnly', // Auto-switches to localStorage in localhost
  ezauthUrl: getWebUrl('ezauth'),
  protectedPaths: ['/dashboard'],
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  intlMiddleware,
  cookieName: 'ezauth_token', // Match the actual cookie name from EZAuth API
})

// Next.js requires a literal object for static analysis at build time
export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
