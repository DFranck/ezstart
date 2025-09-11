'use client'

import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages, Locale } from 'next-intl'
import * as React from 'react'

export interface IntlProviderProps {
  children: React.ReactNode
  messages: AbstractIntlMessages
  locale: Locale
  timeZone?: string
}

/**
 * Standalone Intl Provider
 * Usage:
 * ```tsx
 * import { IntlProvider } from '@ezstart/web-core/providers/intl'
 * 
 * <IntlProvider messages={messages} locale={locale}>
 *   {children}
 * </IntlProvider>
 * ```
 */
export function IntlProvider({ 
  children, 
  messages, 
  locale, 
  timeZone = 'UTC' 
}: IntlProviderProps) {
  return (
    <NextIntlClientProvider
      messages={messages}
      locale={locale}
      timeZone={timeZone}
    >
      {children}
    </NextIntlClientProvider>
  )
}