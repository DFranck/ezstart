'use client'

import { Link } from '@/i18n/navigation'
import { useAuth } from '@ezstart/auth-sdk'
import { UserMenuV2, type UserMenuItem } from '@ezstart/auth-sdk/components'
import { AppShell as BaseAppShell, LocaleSwitcher } from '@ezstart/ui/components'
import { ThemeSwitcher, useTheme } from '@ezstart/ui/theme'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { EzauthScopeIndicator } from './ezauth-scope-indicator'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'vi', label: 'VI' },
]

const ADMIN_SCOPE_PREFIXES = ['/admin']
const USER_SCOPE_PREFIXES = ['/dashboard', '/account', '/developer']

function detectScope(pathname: string): 'user' | 'admin' | null {
  if (ADMIN_SCOPE_PREFIXES.some(p => pathname.includes(p))) return 'admin'
  if (USER_SCOPE_PREFIXES.some(p => pathname.includes(p))) return 'user'
  return null
}

export interface AppShellProps {
  children: ReactNode
}

/**
 * Public marketing AppShell — header + footer + UserMenu chrome rendered
 * around children. Mounted by `(public)/layout.tsx` for marketing routes
 * (/, /about, /pricing, /blog, /contact, /privacy, /terms, /status,
 * /changelog). NOT used on bare/app/auth route groups — those have their
 * own dedicated layouts.
 */
export function AppShell({ children }: AppShellProps) {
  const t = useTranslations('layout')
  const tMenu = useTranslations('layout.userMenuV2')
  const tAccount = useTranslations('layout.accountModalV2')
  const { isAuthenticated, user } = useAuth()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const isSuperadmin = user?.globalRoles?.includes('superadmin') ?? false
  const scope = detectScope(pathname)
  const showScopeIndicator = isAuthenticated && scope !== null

  // Immersive header on the public landing home only — overlay positions the
  // header `absolute top-0` so the hero (`<LandingHero variant="full" />`)
  // can render full-viewport (100vh) under it. All other public pages keep
  // the default sticky header. Pathname is locale-prefixed by next-intl
  // (`/en`, `/fr`, `/vi`) so we strip the leading 3-char segment before
  // comparing to `/`.
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/'
  const headerMode: 'sticky' | 'overlay' = pathWithoutLocale === '/' ? 'overlay' : 'sticky'

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

  // `authActions` = standalone header switchers (theme + locale + scope
  // indicator). Rendered desktop next to nav, collapsed into mobile drawer.
  // Anonymous users still need direct access to theme/locale even though
  // they don't have a UserMenu dropdown — that's why we expose them here in
  // addition to embedding them inside the UserMenuV2 dropdown for logged-in.
  const authActions = (
    <>
      {showScopeIndicator && scope !== null && <EzauthScopeIndicator scope={scope} />}
      <LocaleSwitcher
        locales={LANGUAGES.map(l => l.code)}
        currentLocale={locale}
        onLocaleChange={handleLocaleChange}
      />
      <ThemeSwitcher />
    </>
  )

  // UserMenu lives in `persistentActions` so it stays glued to the right of
  // the header on mobile (next to the burger toggle) instead of being hidden
  // inside the burger drawer — Stripe / Clerk / Vercel pattern.
  const persistentActions = (
    <UserMenuV2
      extraItems={extraItems}
      texts={{
        signIn: t('navSignIn'),
        manageAccount: tMenu('manageAccount'),
        signOut: tMenu('signOut'),
        signingOut: tMenu('signingOut'),
        signOutSuccess: tMenu('signOutSuccess'),
        signOutError: tMenu('signOutError'),
        signOutAllDevices: tMenu('signOutAllDevices'),
        signOutAllSuccess: tMenu('signOutAllSuccess'),
        signOutAllError: tMenu('signOutAllError'),
        emailVerified: tMenu('emailVerified'),
        emailUnverified: tMenu('emailUnverified'),
        resendVerification: tMenu('resendVerification'),
        verificationSent: tMenu('verificationSent'),
        verifyError: tMenu('verifyError'),
        themeLabel: tMenu('themeLabel'),
        themeLight: tMenu('themeLight'),
        themeDark: tMenu('themeDark'),
        themeSystem: tMenu('themeSystem'),
        notifications: tMenu('notifications'),
        notificationsBadgeLabel: tMenu('notificationsBadgeLabel'),
        helpAndResources: tMenu('helpAndResources'),
        helpCenter: tMenu('helpCenter'),
        keyboardShortcuts: tMenu('keyboardShortcuts'),
        keyboardShortcutsHint: tMenu('keyboardShortcutsHint'),
        status: tMenu('status'),
        changelog: tMenu('changelog'),
        managePlan: tMenu('managePlan'),
      }}
      accountModalTexts={{
        title: tAccount('title'),
        needHelp: tAccount('needHelp'),
        toggleNavigation: tAccount('toggleNavigation'),
        profileTab: tAccount('profileTab'),
        settingsTab: tAccount('settingsTab'),
        updateProfile: tAccount('updateProfile'),
        emailSection: tAccount('emailSection'),
        primary: tAccount('primary'),
        connectedAccounts: tAccount('connectedAccounts'),
        connectAccount: tAccount('connectAccount'),
        themeSection: tAccount('themeSection'),
        themeLight: tAccount('themeLight'),
        themeDark: tAccount('themeDark'),
        themeSystem: tAccount('themeSystem'),
        languageSection: tAccount('languageSection'),
        memberSince: tAccount('memberSince'),
        firstName: tAccount('firstName'),
        lastName: tAccount('lastName'),
        save: tAccount('save'),
        cancel: tAccount('cancel'),
        profileUpdated: tAccount('profileUpdated'),
        changeAvatar: tAccount('changeAvatar'),
        cropAvatar: tAccount('cropAvatar'),
        passwordSection: tAccount('passwordSection'),
        currentPassword: tAccount('currentPassword'),
        newPassword: tAccount('newPassword'),
        changePassword: tAccount('changePassword'),
        createPassword: tAccount('createPassword'),
        passwordChanged: tAccount('passwordChanged'),
        securitySection: tAccount('securitySection'),
        manageSecurity: tAccount('manageSecurity'),
        emailVerified: tAccount('emailVerified'),
        emailUnverified: tAccount('emailUnverified'),
        resendVerification: tAccount('resendVerification'),
        verificationSent: tAccount('verificationSent'),
        verifyError: tAccount('verifyError'),
        dateLocale: locale,
      }}
      theme={theme ? { theme, setTheme } : undefined}
      languages={LANGUAGES}
      currentLocale={locale}
      onLocaleChange={handleLocaleChange}
      planLabel="Free"
      helpHref={`/${locale}/docs`}
      statusHref={`/${locale}/status`}
      changelogHref={`/${locale}/changelog`}
    />
  )

  return (
    <BaseAppShell
      brand={{ name: 'EZAuth', logoSrc: '/logo.svg' }}
      navLinks={[
        { href: '/#features', label: t('navFeatures') },
        { href: '/#pricing', label: t('navPricing') },
        { href: '/docs', label: t('navDocs') },
      ]}
      footerColumns={[
        {
          title: t('footerProduct'),
          links: [
            { href: '/docs', label: t('footerDocs') },
            { href: '/#pricing', label: t('footerPricing') },
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
      persistentActions={persistentActions}
      LinkComponent={Link}
      headerMode={headerMode}
    >
      {children}
    </BaseAppShell>
  )
}
