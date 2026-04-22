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
  P,
  Span,
} from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
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

  return (
    <AppLayout>
      {/* ---- Header ---- */}
      <AppHeader>
        <AppLogo>
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Image src="/logo.svg" alt="EZPay" width={28} height={28} />
            <Span className="text-lg font-bold tracking-tight">EZPay</Span>
          </Link>
        </AppLogo>

        <AppNav>
          <AppNavLink href="#features">{nav('features')}</AppNavLink>
          <AppNavLink href="#pricing">{nav('pricing')}</AppNavLink>
          <AppNavLink href="/docs">{nav('docs')}</AppNavLink>
          {isAuthenticated && <AppNavLink href="/dashboard">{nav('dashboard')}</AppNavLink>}
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
              <LoginButton size="sm" loginText={nav('signIn')} />
            )}
          </Div>
          <AppMobileToggle />
        </AppActions>

        <AppMobileMenu>
          <AppMobileLink href="#features">{nav('features')}</AppMobileLink>
          <AppMobileLink href="#pricing">{nav('pricing')}</AppMobileLink>
          <AppMobileLink href="/docs">{nav('docs')}</AppMobileLink>
          {isAuthenticated && <AppMobileLink href="/dashboard">{nav('dashboard')}</AppMobileLink>}
          <Div className="px-3 pt-2 flex flex-col gap-2">
            <Div className="flex items-center gap-2">
              <LocaleSwitcher
                locales={LOCALES}
                currentLocale={locale}
                onLocaleChange={handleLocaleChange}
              />
              <ThemeSwitcher />
            </Div>
            {isAuthenticated ? (
              <UserMenu
                onManageAccount={() => router.push(`/${locale}/dashboard?section=account`)}
              />
            ) : (
              <LoginButton className="w-full" loginText={nav('signIn')} />
            )}
          </Div>
        </AppMobileMenu>
      </AppHeader>

      {/* ---- Main ---- */}
      <AppMain>{children}</AppMain>

      {/* ---- Footer ---- */}
      <AppFooter>
        <Div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title={footer('product')}>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/docs">{footer('docs')}</Link>
            </P>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="#pricing">{footer('pricing')}</Link>
            </P>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/changelog">{footer('changelog')}</Link>
            </P>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/status">{footer('status')}</Link>
            </P>
          </FooterColumn>

          <FooterColumn title={footer('company')}>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/about">{footer('about')}</Link>
            </P>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/blog">{footer('blog')}</Link>
            </P>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/contact">{footer('contact')}</Link>
            </P>
          </FooterColumn>

          <FooterColumn title={footer('legal')}>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/privacy">{footer('privacy')}</Link>
            </P>
            <P className="text-sm text-muted-foreground hover:text-foreground">
              <Link href="/terms">{footer('terms')}</Link>
            </P>
          </FooterColumn>

          <FooterBrand tagline={footer('tagline')} copyright={`\u00A9 2026 ${footer('copyright')}`}>
            <Div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="EZPay" width={24} height={24} />
              <Span className="text-lg font-bold">EZPay</Span>
            </Div>
          </FooterBrand>
        </Div>
      </AppFooter>
    </AppLayout>
  )
}
