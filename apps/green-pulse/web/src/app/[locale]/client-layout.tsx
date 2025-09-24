'use client'
import { routing } from '@/i18n/routing'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { ClientLayout, LocaleSwitcher } from '@ezstart/ui/components'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'

const AppClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()

  const handleLocaleChange = (locale: string) => {
    if (!pathname) return
    const segments = pathname.split('/')
    segments[1] = locale
    const newPath = segments.join('/')
    router.push(newPath)
  }

  return (
    <ClientLayout
      appName="Green Pulse"
      currentPath={pathname}
      logoIcon="lucide:Zap"
      logoHref="/"
      // Header navigation
      headerNavigation={[]}
      // CTA Button
      // ctaText="Get Started"
      // ctaVariant="ghost"
      // ctaSize="sm"
      // onCtaClick={() => console.log('CTA clicked')}
      // Header right content (ThemeSwitcher, etc.)
      headerRightContent={
        <>
          <LocaleSwitcher
            locales={[...routing.locales]}
            currentLocale={currentLocale}
            onLocaleChange={handleLocaleChange}
          />
          <ThemeSwitcher />
        </>
      }
      // Bottom mobile navigation
      bottomNavigation={[]}
      // Social links
      socialLinks={[]}
      // Footer links
      footerLinks={[]}
      // Use Next.js Link component
      LinkComponent={Link}
    >
      {children}
    </ClientLayout>
  )
}

export default AppClientLayout
