'use client'

import { LoginButton, useAuth } from '@ezstart/auth-sdk'
import { UserMenu } from '@ezstart/auth-sdk/components'
import { LocaleSwitcher, AppShell as BaseAppShell } from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'

const LOCALES = ['en', 'fr']

export function AppShell({ children }: { children: ReactNode }) {
  const nav = useTranslations('layout.nav')
  const footer = useTranslations('layout.footer')
  const { isAuthenticated } = useAuth()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
  }

  const navLinks = [
    { href: '#features', label: nav('features') },
    { href: '#pricing', label: nav('pricing') },
    { href: '/docs', label: nav('docs') },
    ...(isAuthenticated ? [{ href: '/dashboard', label: nav('dashboard') }] : []),
  ]

  const authActions = (
    <>
      <LocaleSwitcher
        locales={LOCALES}
        currentLocale={locale}
        onLocaleChange={handleLocaleChange}
      />
      <ThemeSwitcher />
      {isAuthenticated ? (
        <UserMenu onManageAccount={() => router.push(`/${locale}/dashboard?section=account`)} />
      ) : (
        <LoginButton size="sm" loginText={nav('signIn')} />
      )}
    </>
  )

  return (
    <BaseAppShell
      brand={{ name: 'EZPay', logoSrc: '/logo.svg' }}
      navLinks={navLinks}
      footerColumns={[
        {
          title: footer('product'),
          links: [
            { href: '/docs', label: footer('docs') },
            { href: '#pricing', label: footer('pricing') },
            { href: '/changelog', label: footer('changelog') },
            { href: '/status', label: footer('status') },
          ],
        },
        {
          title: footer('company'),
          links: [
            { href: '/about', label: footer('about') },
            { href: '/blog', label: footer('blog') },
            { href: '/contact', label: footer('contact') },
          ],
        },
        {
          title: footer('legal'),
          links: [
            { href: '/privacy', label: footer('privacy') },
            { href: '/terms', label: footer('terms') },
          ],
        },
      ]}
      footerBrand={{
        tagline: footer('tagline'),
        copyright: `© 2026 ${footer('copyright')}`,
      }}
      authActions={authActions}
      LinkComponent={Link}
    >
      {children}
    </BaseAppShell>
  )
}
