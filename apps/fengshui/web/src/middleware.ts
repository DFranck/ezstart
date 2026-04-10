// apps/fengshui/web/middleware.ts
import { createAuthMiddleware } from '@ezstart/auth-sdk'

export default createAuthMiddleware({
  appName: 'fengshui',
  authMode: 'httpOnly',
  protectedPaths: ['/dashboard'],
  locales: ['fr', 'en', 'es'],
  defaultLocale: 'fr',
})

export const config = {
  matcher: ['/((?!api|trpc|health|_next|_vercel|.*\\..*).*)'],
}
