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
      bottomNavigation={[
        { href: '/', icon: 'lucide:Home', label: 'Home' },
        { href: '/dashboard', icon: 'lucide:BarChart3', label: 'Dashboard' },
        { href: '/analytics', icon: 'lucide:TrendingUp', label: 'Analytics' },
        { href: '/settings', icon: 'lucide:Settings', label: 'Settings' },
      ]}
      // Social links
      socialLinks={[
        { href: 'https://github.com', icon: 'lucide:Github', label: 'GitHub' },
        { href: 'https://twitter.com', icon: 'lucide:Twitter', label: 'Twitter' },
        { href: 'https://linkedin.com', icon: 'lucide:Linkedin', label: 'LinkedIn' },
      ]}
      // Footer links
      footerLinks={[
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
        { href: '/legal', label: 'Legal Notices' },
      ]}
      // Use Next.js Link component
      LinkComponent={Link}
    >
      {children}
    </ClientLayout>
  )
}

export default AppClientLayout
