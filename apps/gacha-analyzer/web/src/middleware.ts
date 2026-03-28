import createIntlMiddleware from 'next-intl/middleware'
import { createAuthMiddleware } from '@ezstart/auth-sdk'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export default createAuthMiddleware({
  appName: 'gacha-analyzer',
  authMode: 'jwt',
  protectedPaths: [],
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  intlMiddleware,
})

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
