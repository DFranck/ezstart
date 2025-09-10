'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import {
  AbstractIntlMessages,
  Locale,
  NextIntlClientProvider,
} from 'next-intl'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'

export interface ClientProvidersProps {
  children: React.ReactNode
  messages?: AbstractIntlMessages
  locale?: Locale
  timeZone?: string
  appName: string
}

export function ClientProviders({
  children,
  messages,
  locale,
  timeZone,
  appName,
}: ClientProvidersProps) {
  // Debug pour voir pourquoi le contexte intl n'est pas disponible
  if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
    console.log('ClientProviders props:', { 
      hasMessages: !!messages,
      locale,
      timeZone,
      appName 
    })
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider appName={appName}>
        {messages && locale ? (
          <NextIntlClientProvider
            messages={messages}
            locale={locale}
            timeZone={timeZone || 'UTC'}
          >
            {children}
          </NextIntlClientProvider>
        ) : (
          // Fallback avec des valeurs par défaut pour éviter le crash
          <NextIntlClientProvider
            messages={{}}
            locale="en"
            timeZone="UTC"
          >
            {children}
          </NextIntlClientProvider>
        )}
      </AuthProvider>
    </NextThemesProvider>
  )
}

// Pour les apps sans i18n avec sync theme depuis URL
export function SimpleClientProviders({
  children,
  appName,
}: {
  children: React.ReactNode
  appName: string
}) {
  return (
    <SimpleThemeProvider>
      <AuthProvider appName={appName}>
        {children}
      </AuthProvider>
    </SimpleThemeProvider>
  )
}

// Composant séparé pour gérer le theme sync une seule fois
function SimpleThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Sync theme depuis URL une seule fois au mount, mais seulement après hydratation
    const syncThemeFromURL = () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const themeParam = urlParams.get('theme')
        if (themeParam && ['light', 'dark', 'system'].includes(themeParam)) {
          // Force le theme depuis l'URL sans affecter le defaultTheme
          document.documentElement.setAttribute('data-theme', themeParam)
          if (themeParam === 'dark') {
            document.documentElement.classList.add('dark')
          } else if (themeParam === 'light') {
            document.documentElement.classList.remove('dark')
          }
        }
      }
    }
    
    // Attendre un tick pour éviter les problèmes d'hydratation
    const timeoutId = setTimeout(syncThemeFromURL, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Éviter le flash pendant le mounting
  if (!mounted) {
    return (
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    )
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}