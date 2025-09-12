'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/next-theme'
import './globals.css'

// Note: metadata must be exported from a non-client component
// This will be moved to a separate metadata file if needed

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>EZAuth - Authentication</title>
        <meta name="description" content="EZStart centralized authentication service" />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <AuthProvider appName="ezauth">
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center mx-2">
              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
