import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EZAuth - Authentication',
  description: 'EZStart centralized authentication service',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center mx-2">
        {children}
      </body>
    </html>
  )
}
