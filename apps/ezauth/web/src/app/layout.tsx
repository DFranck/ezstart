import { createMetadata, createViewport } from '@ezstart/seo-config/metadata'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata = createMetadata({
  appName: 'EZAuth',
  description: 'EZStart centralized authentication service - Secure SSO for all EZStart applications',
  domain: 'https://ezauth.vercel.app',
  keywords: ['authentication', 'SSO', 'OAuth2', 'login', 'ezstart'],
  themeColor: '#000000',
  ogImage: 'https://ezauth.vercel.app/og-image.svg',
})

export const viewport = createViewport('#000000')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <div className="min-h-screen bg-background text-foreground flex items-center justify-center mx-2">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
