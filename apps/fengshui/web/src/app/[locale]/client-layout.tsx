'use client'

import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { GRADIENT_TEXT } from '@/lib/theme-colors'
import { LoginButton, useAuth } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import {
  ClientLayout as BaseClientLayout,
  Div,
  H1,
  LocaleSwitcher,
  P,
  Span,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import React, { ReactNode } from 'react'

type ClientLayoutProps = {
  children: ReactNode
}

const ClientLayout = ({ children }: ClientLayoutProps): React.JSX.Element => {
  const { isAuthenticated, login, logout } = useAuth()
  const { theme } = useTheme()
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const isAnalyzePage = pathname === '/analyze'

  const locales = ['fr', 'en', 'es']

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <BaseClientLayout
      className={cn(isAnalyzePage ? 'h-[100dvh] overflow-hidden' : 'mb-10 sm:mb-0')}
      appName="Feng Shui"
      showHeader={!isAnalyzePage}
      showFooter={!isAnalyzePage}
      headerPosition="sticky"
      creator={<Span>Made with ❤️ for a peaceful living place and life serenity</Span>}
      currentPath={pathname}
      headerLeftContent={
        <Div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/logo.png"
              alt="Feng Shui"
              width={100}
              height={100}
              className="object-contain"
            />
            <Div>
              <H1 size={'h5'} className={`text-start w-fit font-bold ${GRADIENT_TEXT}`}>
                Feng Shui {new Date().getFullYear()}
              </H1>
              <P className="text-xs text-muted-foreground -mt-1 line-clamp-1">
                {t('hero.subtitle', { year: new Date().getFullYear() })}
              </P>
            </Div>
          </Link>
        </Div>
      }
      navLinks={[
        { href: '/', label: t('navigation.home'), icon: 'lucide:Home' },
        { href: '/dashboard', label: t('navigation.plans'), icon: 'lucide:FolderOpen' },
        { href: '/analyze', label: t('navigation.analyze'), icon: 'lucide:Sparkles' },
        { href: '/donate', label: t('common.donate'), icon: 'lucide:Leaf' },
      ]}
      headerRightContent={
        <Div className="flex items-center gap-2">
          <LoginButton>{isAuthenticated ? t('common.logout') : t('common.login')}</LoginButton>
          <LocaleSwitcher
            locales={locales}
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
          />
          <ThemeSwitcher />
        </Div>
      }
      LinkComponent={Link}
    >
      {children}
    </BaseClientLayout>
  )
}

export default ClientLayout
