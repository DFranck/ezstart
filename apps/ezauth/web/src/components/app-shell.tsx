'use client'

import { LoginButton, useAuth } from '@ezstart/auth-sdk'
import { UserMenu, type UserMenuItem } from '@ezstart/auth-sdk/components'
import { LocaleSwitcher, SaaSAppShell } from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

const LOCALES = ['en', 'fr', 'vi']

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('layout')
  const { isAuthenticated, user } = useAuth()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false

  const handleLocaleChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
  }

  // Build user menu extra items (Dashboard, Developer, Admin if superadmin).
  const extraItems: UserMenuItem[] = [
    {
      label: t('userMenuDashboard'),
      href: `/${locale}/dashboard`,
      icon: 'lucide:LayoutDashboard',
    },
    {
      label: t('userMenuDeveloper'),
      href: `/${locale}/developer`,
      icon: 'lucide:Code',
    },
    ...(isSuperadmin
      ? [
          {
            label: t('userMenuAdmin'),
            href: `/${locale}/admin`,
            icon: 'lucide:Shield',
            separator: true,
          },
        ]
      : []),
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
        <UserMenu extraItems={extraItems} />
      ) : (
        <LoginButton size="sm" loginText={t('navSignIn')} />
      )}
    </>
  )

  return (
    <SaaSAppShell
      brand={{ name: 'EZAuth', logoSrc: '/logo.svg' }}
      navLinks={[
        { href: '#features', label: t('navFeatures') },
        { href: '#pricing', label: t('navPricing') },
        { href: '/docs', label: t('navDocs') },
      ]}
      footerColumns={[
        {
          title: t('footerProduct'),
          links: [
            { href: '/docs', label: t('footerDocs') },
            { href: '#pricing', label: t('footerPricing') },
            { href: '/changelog', label: t('footerChangelog') },
            { href: '/status', label: t('footerStatus') },
          ],
        },
        {
          title: t('footerCompany'),
          links: [
            { href: '/about', label: t('footerAbout') },
            { href: '/blog', label: t('footerBlog') },
            { href: '/contact', label: t('footerContact') },
          ],
        },
        {
          title: t('footerLegal'),
          links: [
            { href: '/privacy', label: t('footerPrivacy') },
            { href: '/terms', label: t('footerTerms') },
          ],
        },
      ]}
      footerBrand={{
        tagline: t('footerTagline'),
        copyright: `© ${t('footerCopyright')}`,
      }}
      authActions={authActions}
      LinkComponent={Link}
    >
      {children}
    </SaaSAppShell>
  )
}
