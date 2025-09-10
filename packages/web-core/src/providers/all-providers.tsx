'use client'

import * as React from 'react'
import { IntlProvider } from './intl-provider.js'
import { ThemeProvider } from './theme-provider.js'
import { AuthProvider } from '@ezstart/auth-sdk'
import type { AbstractIntlMessages, Locale } from 'next-intl'

export interface AllProvidersProps {
  children: React.ReactNode
  // Intl config
  messages?: AbstractIntlMessages
  locale?: Locale
  timeZone?: string
  // Auth config
  appName: string
  // Theme config (all optional with defaults)
  defaultTheme?: string
  enableSystem?: boolean
}

/**
 * Provider combiné pour ceux qui veulent tout
 * Usage:
 * ```tsx
 * import { AllProviders } from '@ezstart/web-core/providers'
 * 
 * <AllProviders appName="myapp" messages={messages} locale={locale}>
 *   {children}
 * </AllProviders>
 * ```
 */
export function AllProviders({
  children,
  messages,
  locale,
  timeZone,
  appName,
  defaultTheme,
  enableSystem,
}: AllProvidersProps) {
  // Si pas d'intl, on ne wrap pas avec IntlProvider
  const withIntl = messages && locale

  const content = (
    <ThemeProvider defaultTheme={defaultTheme} enableSystem={enableSystem}>
      <AuthProvider appName={appName}>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )

  if (withIntl) {
    return (
      <IntlProvider messages={messages} locale={locale} timeZone={timeZone}>
        {content}
      </IntlProvider>
    )
  }

  return content
}