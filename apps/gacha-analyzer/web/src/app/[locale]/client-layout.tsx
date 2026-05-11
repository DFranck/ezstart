'use client'
import { routing } from '@/i18n/routing'
import { LoginButton, useAuthStore } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import { ClientLayout, Div, LocaleSwitcher, Span } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { usePathname, useRouter, useParams } from 'next/navigation'
import React from 'react'
import type { GameType } from '@gacha-analyzer/types'

const VALID_GAMES: GameType[] = ['summoners-war', 'nikke']

const AppClientLayout = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const currentLocale = useLocale()
  const t = useTranslations()
  const tAuth = useTranslations('auth')

  const game = VALID_GAMES.includes(params.game as GameType) ? (params.game as GameType) : null

  const handleLocaleChange = (locale: string) => {
    if (!pathname) return
    const segments = pathname.split('/')
    segments[1] = locale
    const newPath = segments.join('/')
    router.push(newPath)
  }

  const navLinks = game
    ? [
        { href: '/', label: t('nav.home'), icon: 'lucide:Home' as const },
        { href: `/${game}/scan`, label: t('nav.scan'), icon: 'lucide:ScanLine' as const },
        { href: `/${game}/bench`, label: t('nav.bench'), icon: 'lucide:FlaskConical' as const },
        {
          href: `/${game}/calculate`,
          label: t('nav.calculate'),
          icon: 'lucide:Calculator' as const,
        },
        { href: `/${game}/history`, label: t('nav.history'), icon: 'lucide:Clock' as const },
        { href: `/${game}/data`, label: t('nav.data'), icon: 'lucide:Database' as const },
        { href: `/${game}/sources`, label: t('nav.sources'), icon: 'lucide:BookOpen' as const },
      ]
    : [{ href: '/', label: t('nav.home'), icon: 'lucide:Home' as const }]

  return (
    <ClientLayout
      appName="Gacha Analyzer"
      currentPath={pathname}
      navLinks={navLinks}
      headerLeftContent={
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Span>🎮</Span>
          <Span>Gacha Analyzer</Span>
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
