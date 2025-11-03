import { createAuthMiddleware, authMiddlewareConfig } from '@ezstart/auth-sdk'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Create i18n middleware
const intlMiddleware = createIntlMiddleware(routing)

// Create auth middleware with protected paths
export default createAuthMiddleware({
  appName: 'ezbill',
  protectedPaths: ['/dashboard', '/clients', '/invoices', '/quotes', '/receipts', '/settings'],
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  intlMiddleware, // Apply i18n after auth check
})

export const config = authMiddlewareConfig
