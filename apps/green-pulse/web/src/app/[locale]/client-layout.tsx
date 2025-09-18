'use client'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { ClientLayout } from '@ezstart/ui/components'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const AppClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()

  return (
    <ClientLayout
      appName="Green Pulse"
      currentPath={pathname}
      logoIcon="lucide:Zap"
      logoHref="/"
      // Header navigation
      headerNavigation={[]}
      // CTA Button
      ctaText="Get Started"
      ctaVariant="ghost"
      ctaSize="sm"
      onCtaClick={() => console.log('CTA clicked')}
      // Header right content (ThemeSwitcher, etc.)
      headerRightContent={<ThemeSwitcher />}
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
