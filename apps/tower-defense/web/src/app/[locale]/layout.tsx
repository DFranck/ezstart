import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import { Toaster } from '@ezstart/ui/components'
import '@ezstart/ui/globals.css'
import { createJsonLd } from '@ezstart/seo-config/json-ld'
import { Geist, Geist_Mono } from 'next/font/google'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GamesSocketProvider } from '@/contexts/GamesSocketContext'
import { PWAInstallPrompt } from '@ezstart/ui/components'

const jsonLd = createJsonLd({
  appName: 'Tower Defense',
  description: 'Competitive multiplayer Tower Defense game with RNG shop mechanics and PvP battles',
  url: 'https://tower-defense.vercel.app',
  applicationCategory: 'GameApplication',
})

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="Tower Defense" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tower Defense" />
        <meta
          name="description"
          content="Competitive multiplayer Tower Defense game with RNG shop mechanics and PvP battles"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3b82f6" />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3b82f6" />
        <link rel="shortcut icon" href="/favicon.ico" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://tower-defense.vercel.app" />
        <meta name="twitter:title" content="Tower Defense" />
        <meta name="twitter:description" content="Competitive multilayer Tower Defense game" />
        <meta
          name="twitter:image"
          content="https://tower-defense.vercel.app/icons/icon-192x192.png"
        />
        <meta name="twitter:creator" content="@towerdefense" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Tower Defense" />
        <meta property="og:description" content="Competitive multiplayer Tower Defense game" />
        <meta property="og:site_name" content="Tower Defense" />
        <meta property="og:url" content="https://tower-defense.vercel.app" />
        <meta
          property="og:image"
          content="https://tower-defense.vercel.app/icons/icon-192x192.png"
        />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider appName="tower-defense">
              <GamesSocketProvider>{children}</GamesSocketProvider>
            </AuthProvider>
          </ThemeProvider>
          <Toaster />
          <PWAInstallPrompt
            appName="Tower Defense"
            description="Installez l'application pour un accès rapide et une meilleure expérience de jeu"
          />
        </ErrorBoundary>
      </body>
    </html>
  )
}
