import './globals.css'
import { routing } from '@/i18n/routing'
import { ReactNode } from 'react'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
