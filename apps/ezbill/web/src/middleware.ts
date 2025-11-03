import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// TEMPORARY: Disabled auth middleware for localhost development
// HttpOnly cookies don't work cross-port (localhost:5010 vs localhost:5025)
// Using localStorage mode instead (useHttpOnlyCookies={false})
// TODO: Re-enable in production with proper domain setup
export default createIntlMiddleware(routing)

// Next.js requires a literal object for static analysis at build time
export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
