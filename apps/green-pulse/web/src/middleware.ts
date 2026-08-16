// apps/green-pulse/web/middleware.ts
import createIntlMiddleware from 'next-intl/middleware'
import { createAuthMiddleware } from '@ezstart/auth-sdk'
import { getWebUrl } from '@ezstart/config'
import { routing } from './i18n/routing'

// Create i18n middleware
const intlMiddleware = createIntlMiddleware(routing)

// Create auth middleware with JWT mode for external domain
// - localhost: Automatically uses localStorage mode (no middleware checks)
// - production www.ai-greenpulse.com: Uses JWT validation
// - *.ezstart.xyz: Would use httpOnly cookies (not applicable here)
export default createAuthMiddleware({
  appName: 'green-pulse',
  authMode: 'jwt', // External domain requires JWT mode
  ezauthUrl: getWebUrl('ezauth'),
  protectedPaths: ['/dashboard', '/chat'],
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  intlMiddleware,
  debug: true, // Enable debug mode to troubleshoot auth issues
})

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
