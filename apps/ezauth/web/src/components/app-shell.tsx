'use client'

import { LoginButton, useAuth } from '@ezstart/auth-sdk'
import { UserMenu } from '@ezstart/auth-sdk/components'
import {
  AppActions,
  AppFooter,
  AppHeader,
  AppLayout,
  AppLogo,
  AppMain,
  AppMobileLink,
  AppMobileMenu,
  AppMobileToggle,
  AppNav,
  AppNavLink,
  Div,
  FooterBrand,
  FooterColumn,
  LocaleSwitcher,
  Span,
} from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

// FooterLink component is shadowed by FooterLink type in @ezstart/ui exports,
// so we inline a small equivalent here.
function FooterLinkItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  )
}

const LOCALES = ['en', 'fr', 'vi']

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('layout')
  const { isAuthenticated } = useAuth()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = (newLocale: string) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
  }

  return (
    <AppLayout>
      {/* ----- Header ----- */}
      <AppHeader>
        <AppLogo>
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Image src="/logo.svg" alt="EZAuth" width={28} height={28} />
            <Span className="text-lg font-bold tracking-tight">EZAuth</Span>
          </Link>
        </AppLogo>

        <AppNav>
          <AppNavLink href="#features">{t('navFeatures')}</AppNavLink>
          <AppNavLink href="#pricing">{t('navPricing')}</AppNavLink>
          <AppNavLink href="/docs">{t('navDocs')}</AppNavLink>
        </AppNav>

        <AppActions>
          <Div className="hidden items-center gap-2 md:flex">
            <LocaleSwitcher
              locales={LOCALES}
              currentLocale={locale}
              onLocaleChange={handleLocaleChange}
            />
            <ThemeSwitcher />
            {isAuthenticated ? (
              <UserMenu
                onManageAccount={() => router.push(`/${locale}/dashboard?section=account`)}
              />
            ) : (
              <LoginButton size="sm" loginText={t('navSignIn')} />
            )}
          </Div>
          <AppMobileToggle />
        </AppActions>

        <AppMobileMenu>
          <AppMobileLink href="#features">{t('navFeatures')}</AppMobileLink>
          <AppMobileLink href="#pricing">{t('navPricing')}</AppMobileLink>
          <AppMobileLink href="/docs">{t('navDocs')}</AppMobileLink>
          <Div className="flex items-center justify-end gap-2 px-3 pt-2">
            <LocaleSwitcher
              locales={LOCALES}
              currentLocale={locale}
              onLocaleChange={handleLocaleChange}
            />
            <ThemeSwitcher />
            {isAuthenticated ? (
              <UserMenu
                onManageAccount={() => router.push(`/${locale}/dashboard?section=account`)}
              />
            ) : (
              <LoginButton loginText={t('navSignIn')} />
            )}
          </Div>
        </AppMobileMenu>
      </AppHeader>

      {/* ----- Main ----- */}
      <AppMain>{children}</AppMain>

      {/* ----- Footer ----- */}
      <AppFooter>
        <Div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title={t('footerProduct')}>
            <FooterLinkItem href="/docs">{t('footerDocs')}</FooterLinkItem>
            <FooterLinkItem href="#pricing">{t('footerPricing')}</FooterLinkItem>
            <FooterLinkItem href="/changelog">{t('footerChangelog')}</FooterLinkItem>
            <FooterLinkItem href="/status">{t('footerStatus')}</FooterLinkItem>
          </FooterColumn>

          <FooterColumn title={t('footerCompany')}>
            <FooterLinkItem href="/about">{t('footerAbout')}</FooterLinkItem>
            <FooterLinkItem href="/blog">{t('footerBlog')}</FooterLinkItem>
            <FooterLinkItem href="/contact">{t('footerContact')}</FooterLinkItem>
          </FooterColumn>

          <FooterColumn title={t('footerLegal')}>
            <FooterLinkItem href="/privacy">{t('footerPrivacy')}</FooterLinkItem>
            <FooterLinkItem href="/terms">{t('footerTerms')}</FooterLinkItem>
          </FooterColumn>

          <FooterBrand tagline={t('footerTagline')} copyright={`\u00A9 ${t('footerCopyright')}`}>
            <Div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="EZAuth" width={24} height={24} />
              <Span className="text-lg font-bold">EZAuth</Span>
            </Div>
          </FooterBrand>
        </Div>
      </AppFooter>
    </AppLayout>
  )
}
