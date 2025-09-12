import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import '@ezstart/ui/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './fengshui-colors.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Feng Shui Bagua - Application Interactive',
  description:
    "Application web pour l'analyse Feng Shui avec import de plans et roue d'orientation interactive",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Feng Shui',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-96x96.png',
    apple: '/icons/icon-152x152.png',
  },
}

// Viewport avec themeColor (Next.js 15+)
export const viewport = {
  themeColor: '#10b981',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider appName="fengshui">
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
