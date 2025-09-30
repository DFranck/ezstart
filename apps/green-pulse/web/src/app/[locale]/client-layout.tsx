'use client'
import { routing } from '@/i18n/routing'
import { LoginButton } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { Button, ClientLayout, Div, H1, Icon, LocaleSwitcher } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'

const AppClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()
  const t = useTranslations()

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
      headerLeftContent={
        <Button asChild variant={'ghost'}>
          <Link href="/">
            <Icon name="lucide:Leaf" size={16} fontSize={16} />
            <H1 size={'sm'}>Green Pulse</H1>
          </Link>
        </Button>
      }
      headerCenterContent={
        <Div className="hidden md:flex gap-2">
          <Button asChild variant={'ghost'} size={'sm'}>
            <Link href="/">
              <Icon name="lucide:Home" size={16} />
              Home
            </Link>
          </Button>
          <Button asChild variant={'ghost'} size={'sm'}>
            <Link href="/lia">
              <Icon name="lucide:Bot" size={16} />
              LIA
            </Link>
          </Button>
        </Div>
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
          <ThemeSwitcher />
        </Div>
      }
      bottomNavigation={[
        { href: '/', label: 'Home', icon: 'lucide:Home' },
        { href: '/lia', label: 'LIA', icon: 'lucide:Bot' },
      ]}
      LinkComponent={Link}
    >
      {children}
    </ClientLayout>
  )
}

export default AppClientLayout
