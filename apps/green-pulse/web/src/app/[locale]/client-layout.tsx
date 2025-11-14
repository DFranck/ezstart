'use client'
import { routing } from '@/i18n/routing'
import { LoginButton, useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'
import { ThemeEditor, ThemeSwitcher } from '@ezstart/next-theme/components'
import {
  Button,
  ClientLayout,
  Div,
  H1,
  LocaleSwitcher,
  VersionSwitch,
} from '@ezstart/ui/components'
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
  const isLiaPage = pathname?.includes('/lia')

  return (
    <ClientLayout
      appName="Green Pulse"
      currentPath={pathname}
      // showHeader={!isChatPage && !isLiaPage}
      showFooter={!isChatPage && !isLiaPage}
      mobileLogoSrc="/logo.png"
      mobileLogoAlt="Green Pulse Logo"
      mobileLogoHref="/"
      navLinks={
        isLiaPage
          ? []
          : [
              { href: '/chat', label: 'Chat', icon: 'lucide:Bot' },
              {
                href: '/dashboard',
                label: tForms('navigation.workspaces'),
                icon: 'lucide:Briefcase',
              },
            ]
      }
      headerLeftContent={
        <Button asChild variant={'ghost'}>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="animate-pulse"
              style={{
                filter:
                  'drop-shadow(0 0 8px rgb(16 185 129 / 0.8)) drop-shadow(0 0 16px rgb(16 185 129 / 0.6))',
              }}
            />
            <H1 size={'sm'} className="flex items-baseline">
              <span className="font-k2d">GreenPulse</span>
              <span className="font-gugi">.AI</span>
            </H1>
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
