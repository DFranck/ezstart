'use client'
import { routing } from '@/i18n/routing'
import { LoginButton, useAuthStore } from '@ezstart/auth-sdk'
import { ThemeEditor, ThemeSwitcher } from '@ezstart/next-theme/components'
import { useRBAC } from '@ezstart/rbac'
import { Button, ClientLayout, Div, LocaleSwitcher, VersionSwitch } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'

const AppClientLayout = ({ children }: { children: React.ReactNode }): any => {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()
  const t = useTranslations()
  const tForms = useTranslations('forms')
  const { user } = useAuthStore()
  const rbac = useRBAC(user)

  const handleLocaleChange = (locale: string) => {
    if (!pathname) return
    const segments = pathname.split('/')
    segments[1] = locale
    const newPath = segments.join('/')
    router.push(newPath)
  }

  // Hide header/footer/mobile-nav on full-page layouts
  const isChatPage = pathname?.includes('/chat')

  return (
    <ClientLayout
      appName="Green Pulse"
      currentPath={pathname}
      showHeader={!isChatPage}
      showFooter={!isChatPage}
      mobileLogoSrc="/logo.png"
      mobileLogoAlt="Green Pulse Logo"
      mobileLogoHref="/"
      navLinks={
        isChatPage
          ? []
          : [
              { href: '/chat', label: 'GPA', icon: 'lucide:Bot' as const },
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
            <span className="sr-only">GreenPulse.AI</span>
          </Link>
        </Button>
      }
      headerRightContent={
        <Div>
          <LoginButton
            loginText={t('auth.login')}
            logoutText={t('auth.logout')}
            loadingText={t('auth.loading')}
          />
          <LocaleSwitcher
            locales={[...routing.locales]}
            currentLocale={currentLocale}
            onLocaleChange={handleLocaleChange}
          />
          {/* ThemeEditor: visible only for manager, admin, superadmin */}
          {rbac.hasAnyRole(['manager', 'admin', 'superadmin']) && (
            <ThemeEditor adminOnly={true} enableHistory={true} />
          )}
          <ThemeSwitcher />
        </Div>
      }
      LinkComponent={Link}
    >
      {children}
      {/* VersionSwitch: visible only for manager, admin, superadmin */}
      {rbac.hasAnyRole(['manager', 'admin', 'superadmin']) && (
        <VersionSwitch v1Label="V1" v2Label="V2" position="bottom-left" />
      )}
    </ClientLayout>
  )
}

export default AppClientLayout
