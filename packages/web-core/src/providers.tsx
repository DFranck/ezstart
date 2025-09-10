import * as React from 'react'
import { ClientProviders, SimpleClientProviders } from './client-providers.js'
import type { AbstractIntlMessages, Locale } from 'next-intl'

export interface WebProvidersProps {
  children: React.ReactNode
  messages?: AbstractIntlMessages
  locale?: Locale
  timeZone?: string
  appName: string
}

// Server-side wrapper qui utilise le composant client
export function WebProviders(props: WebProvidersProps) {
  return <ClientProviders {...props} />
}

// Pour les apps sans i18n
export function SimpleWebProviders({
  children,
  appName,
}: {
  children: React.ReactNode
  appName: string
}) {
  return <SimpleClientProviders appName={appName}>{children}</SimpleClientProviders>
}