'use client'
import { routing } from '@/i18n/routing'
import { LoginButton } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { Button, ClientLayout, Div, H1, Icon, LocaleSwitcher } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'

const AppClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()
  const t = useTranslations()
  const tForms = useTranslations('forms')

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
      bottomNavigation={
        isLiaPage
          ? undefined
          : [
              { href: '/', label: 'Home', icon: 'lucide:Home' },
              { href: '/chat', label: 'LIA', icon: 'lucide:Bot' },
              {
                href: '/dashboard',
                label: tForms('navigation.workspaces'),
                icon: 'lucide:Briefcase',
              },
            ]
      }
      headerLeftContent={
        <Button asChild variant={'ghost'}>
          <Link href="/">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="mr-2" />
            {/* <Icon name="lucide:Leaf" size={16} fontSize={16} /> */}
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
            <Link href="/chat">
              <Icon name="lucide:Bot" size={16} />
              Chat
            </Link>
          </Button>
          <Button asChild variant={'ghost'} size={'sm'}>
            <Link href="/dashboard">
              <Icon name="lucide:Briefcase" size={16} />
              {tForms('navigation.workspaces')}
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
      LinkComponent={Link}
    >
      {children}
    </ClientLayout>
  )
}

export default AppClientLayout
