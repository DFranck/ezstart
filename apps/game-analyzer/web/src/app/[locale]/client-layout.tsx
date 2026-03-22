'use client'
import { routing } from '@/i18n/routing'
import { LoginButton, useAuthStore } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { ClientLayout, Div, LocaleSwitcher } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'

const AppClientLayout = ({ children }: { children: React.ReactNode }): any => {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()
  const t = useTranslations()
  const tAuth = useTranslations('auth')

  const handleLocaleChange = (locale: string) => {
    if (!pathname) return
    const segments = pathname.split('/')
    segments[1] = locale
    const newPath = segments.join('/')
    router.push(newPath)
  }

  return (
    <ClientLayout
      appName="Game Analyzer"
      currentPath={pathname}
      navLinks={[
        { href: '/', label: t('nav.dashboard'), icon: 'lucide:Home' as const },
        { href: '/scan', label: t('nav.scan'), icon: 'lucide:ScanLine' as const },
        { href: '/history', label: t('nav.history'), icon: 'lucide:Clock' as const },
      ]}
      headerLeftContent={
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span>🎮</span>
          <span>Game Analyzer</span>
        </Link>
      }
      headerRightContent={
        <Div>
          <LoginButton
            loginText={tAuth('login')}
            logoutText={tAuth('logout')}
            loadingText={tAuth('loading')}
          />
          <LocaleSwitcher
            locales={[...routing.locales]}
            currentLocale={currentLocale}
            onLocaleChange={handleLocaleChange}
          />
          <ThemeSwitcher />
        </Div>
      }
      LinkComponent={Link}
    >
      {children}
    </ClientLayout>
  )
}

export default AppClientLayout
