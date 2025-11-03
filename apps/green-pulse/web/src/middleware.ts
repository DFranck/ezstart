// apps/green-pulse/web/middleware.ts
import createIntlMiddleware from 'next-intl/middleware'
import { createAuthMiddleware } from '@ezstart/auth-sdk'
import { routing } from './i18n/routing'

// Create i18n middleware
const intlMiddleware = createIntlMiddleware(routing)

// Create auth middleware with auto-detection
// - localhost: Automatically uses localStorage mode (no middleware checks)
// - production *.ezstart.xyz: Uses httpOnly cookies
// - external domains: Falls back to localStorage with warning
export default createAuthMiddleware({
  appName: 'green-pulse',
  authMode: 'httpOnly', // Auto-switches to localStorage in localhost
  protectedPaths: ['/dashboard', '/chat'],
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  intlMiddleware,
})

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
