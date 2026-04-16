'use client'
import { routing } from '@/i18n/routing'
import { UserMenu, useAuthStore } from '@ezstart/auth-sdk'
import { useTheme } from 'next-themes'
import { useRBAC } from '@ezstart/auth-sdk'
import { Button, ClientLayout, Div, LocaleSwitcher, Span } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'

const AppClientLayout = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()
  const t = useTranslations()
  const tAuth = useTranslations('auth')
  const tForms = useTranslations('forms')
  const { user, isAuthenticated } = useAuthStore()
  const rbac = useRBAC(user)
  const theme = useTheme()

  const handleLocaleChange = (locale: string) => {
    if (!pathname) return
    const segments = pathname.split('/')
    segments[1] = locale
    const newPath = segments.join('/')
    router.push(newPath)
  }

  // Hide header/footer/mobile-nav on full-page layouts
  const isChatPage = pathname?.includes('/chat')
  const isEarthDayPage = pathname?.includes('/earthday')

  return (
    <ClientLayout
      headerOverlay={isEarthDayPage}
      appName="Green Pulse"
      currentPath={pathname}
      showHeader={!isChatPage && !isEarthDayPage}
      showFooter={!isChatPage && !isEarthDayPage}
      mobileLogoSrc="/logo.png"
      mobileLogoAlt="Green Pulse Logo"
      mobileLogoHref="/"
      navLinks={
        isChatPage || isEarthDayPage
          ? []
          : [
              {
                href: '/#how-it-works',
                label: t('navigation.howItWorks'),
                icon: 'lucide:Lightbulb' as const,
              },
              {
                href: '/#use-cases',
                label: t('navigation.useCases'),
                icon: 'lucide:Boxes' as const,
              },
              {
                href: '/#pricing',
                label: t('navigation.pricing'),
                icon: 'lucide:DollarSign' as const,
              },
              {
                href: '/#partnership',
                label: t('navigation.partnership'),
                icon: 'lucide:Handshake' as const,
              },
              { href: '/careers', label: t('navigation.careers'), icon: 'lucide:Users' as const },
              ...(rbac.hasAnyRole(['admin', 'superadmin'])
                ? [
                    {
                      href: '/dashboard',
                      label: tForms('navigation.workspaces'),
                      icon: 'lucide:Briefcase' as const,
                    },
                  ]
                : []),
              ...(rbac.hasAnyRole(['admin', 'superadmin'])
                ? [{ href: '/admin', label: t('navigation.admin'), icon: 'lucide:Shield' as const }]
                : []),
            ]
      }
      headerLeftContent={
        <Button asChild variant={'ghost'}>
          <Link href="/">
            <Image
              src="/logo_complet_light.svg"
              alt="GreenPulse.AI Logo"
              width={150}
              height={32}
              className="animate-glow-pulse-sm dark:hidden"
            />
            <Image
              src="/logo_complet_dark.svg"
              alt="GreenPulse.AI Logo"
              width={150}
              height={32}
              className="animate-glow-pulse-sm hidden dark:block"
            />
            <Span className="sr-only">GreenPulse.AI</Span>
          </Link>
        </Button>
      }
      headerRightContent={
        <Div>
          {isAuthenticated ? (
            <UserMenu
              theme={theme}
              languages={[
                { code: 'en', label: 'English' },
                { code: 'fr', label: 'Français' },
                { code: 'vi', label: 'Tiếng Việt' },
              ]}
              currentLocale={currentLocale}
              onLocaleChange={handleLocaleChange}
              texts={{
                signOut: tAuth('logout'),
                signIn: tAuth('login'),
              }}
            />
          ) : (
            <>
              <Button asChild size="default" className="bg-gp-primary hover:bg-gp-primary/80">
                <Link href="/chat" target="_blank" rel="noopener noreferrer">
                  {tAuth('getStarted')}
                </Link>
              </Button>
              <LocaleSwitcher
                locales={[...routing.locales]}
                currentLocale={currentLocale}
                onLocaleChange={handleLocaleChange}
              />
            </>
          )}
        </Div>
      }
      LinkComponent={Link}
    >
      {children}
      {/* VersionSwitch: visible only for manager, admin, superadmin */}
      {/* {rbac.hasAnyRole(['manager', 'admin', 'superadmin']) && (
        <VersionSwitch v1Label="V1" v2Label="V2" position="bottom-left" />
      )} */}
    </ClientLayout>
  )
}

export default AppClientLayout
