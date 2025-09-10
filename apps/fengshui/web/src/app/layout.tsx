import { SimpleWebProviders } from '@ezstart/web-core/providers'
import '@ezstart/ui/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './fengshui-colors.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Feng Shui Bagua - Application Interactive',
  description:
    "Application web pour l'analyse Feng Shui avec import de plans et roue d'orientation interactive",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <SimpleWebProviders appName="fengshui">
          {children}
        </SimpleWebProviders>
      </body>
    </html>
  )
}
