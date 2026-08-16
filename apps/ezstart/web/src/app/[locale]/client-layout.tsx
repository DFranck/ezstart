'use client'

import { useNavLinks } from '@/hooks/useNavLinks'
import { Link } from '@/i18n/navigation'
import { LoginButton, SignedIn, SignedOut, UserMenuV2 } from '@ezstart/auth-sdk'
import { getApiUrl } from '@ezstart/config'
import { logger } from '@ezstart/logger'
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
  H2,
  Icon,
  LocaleSwitcher,
  PWAInstallPrompt,
  Span,
  type NavigationLink,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'

type ClientLayoutProps = {
  children: ReactNode
}

type FlatLink = { label: string; href: string }

/**
 * Flatten `NavigationLink[]` (which can contain nested `NavigationMenu`
 * entries) into a single list of `{ label, href }` items. The new
 * `AppLayout` compound from `@ezstart/ui` does not ship a built-in
 * desktop dropdown for nested menus — we surface the children inline so
 * no navigation target is dropped during the migration off the deprecated
 * `ClientLayout`.
 */
function flattenNavLinks(navLinks: NavigationLink[]): FlatLink[] {
  const flat: FlatLink[] = []
  for (const link of navLinks) {
    if ('menuLabel' in link && 'menu' in link) {
      for (const child of link.menu) {
        flat.push({ label: child.label, href: child.href })
      }
    } else {
      flat.push({ label: link.label, href: link.href })
    }
  }
  return flat
}

const ClientLayout = ({ children }: ClientLayoutProps): React.JSX.Element => {
  const { theme, setTheme } = useTheme()
  const { isMobile } = useDevice()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations()

  // SSR-safe locale handling
  let currentLocale = 'en'
  try {
    currentLocale = useLocale()
  } catch (error) {
    logger.warn('useLocale failed, using fallback:', error)
    currentLocale = 'en'
  }

  const navLinks = useNavLinks() as NavigationLink[]
  const flatLinks = flattenNavLinks(navLinks)
  const locales = ['en', 'fr']

  const handleLocaleChange = (newLocale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`)
    router.push(newPath)
  }

  const isActiveLink = (href: string): boolean =>
    pathname === href ||
    pathname === `/${currentLocale}${href}` ||
    pathname === `/${currentLocale}${href === '/' ? '' : href}`

  return (
    <>
      <AppLayout>
        <AppHeader mode="sticky">
          <AppLogo asChild>
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Icon name="custom:Ezstart" size={24} />
              <H2 size="h4">EZStart</H2>
            </Link>
          </AppLogo>

          <AppNav>
            {flatLinks.map(link => (
              <AppNavLink key={link.href} asChild active={isActiveLink(link.href)}>
                <Link href={link.href}>{link.label}</Link>
              </AppNavLink>
            ))}
          </AppNav>

          <AppActions>
            <SignedOut>
              <LoginButton>{t('auth.login')}</LoginButton>
              <LocaleSwitcher
                locales={locales}
                currentLocale={currentLocale}
                onLocaleChange={handleLocaleChange}
              />
              <ThemeSwitcher />
            </SignedOut>
            <SignedIn>
              {/*
                V2 UserMenu (FIX-EZSTART-ADMIN-UI-PASS-001) — drop-in
                replacement for the V1 `<UserMenu>` + `<AccountModal>` which
                emitted deprecation warnings on mount. Embeds `<AccountModalV2>`
                with sidebar nav. Texts shape extends V1 with optional pro-level
                labels — undefined keys fall back to localized SDK defaults
                (en/fr/vi via the auth-sdk dictionary).
              */}
              <UserMenuV2
                avatarSize="sm"
                theme={{ theme, setTheme }}
                googleOAuthUrl={`${getApiUrl('ezauth')}/api/auth/google?app=ezstart`}
                languages={[
                  { code: 'en', label: 'English' },
                  { code: 'fr', label: 'Français' },
                ]}
                currentLocale={currentLocale}
                onLocaleChange={handleLocaleChange}
                texts={{
                  signOut: t('auth.logout'),
                  manageAccount: t('auth.manageAccount') || 'Manage account',
                }}
                accountModalTexts={{
                  title: t('auth.account') || 'Account',
                  profileTab: t('auth.profile'),
                  settingsTab: t('auth.settings'),
                  themeSection: t('theme.theme') || 'Theme',
                  themeLight: t('theme.light'),
                  themeDark: t('theme.dark'),
                  themeSystem: t('theme.system'),
                  languageSection: t('auth.language') || 'Language',
                  emailSection: t('auth.emailAddresses') || 'Email addresses',
                  primary: t('auth.primary') || 'Primary',
                  connectedAccounts: t('auth.connectedAccounts') || 'Connected accounts',
                  connectAccount: t('auth.connectAccount') || 'Connect account',
                  memberSince: t('auth.memberSince') || 'Member since',
                  updateProfile: t('auth.updateProfile') || 'Update profile',
                  firstName: t('auth.firstName') || 'First name',
                  lastName: t('auth.lastName') || 'Last name',
                  save: t('auth.save') || 'Save',
                  cancel: t('auth.cancel') || 'Cancel',
                  passwordSection: t('auth.passwordSection') || 'Password',
                  currentPassword: t('auth.currentPassword') || 'Current password',
                  newPassword: t('auth.newPassword') || 'New password',
                  changePassword: t('auth.changePassword') || 'Change password',
                }}
              />
            </SignedIn>
            <AppMobileToggle />
          </AppActions>
        </AppHeader>

        <AppMobileMenu>
          {flatLinks.map(link => (
            <AppMobileLink key={link.href} asChild active={isActiveLink(link.href)}>
              <Link href={link.href}>{link.label}</Link>
            </AppMobileLink>
          ))}
        </AppMobileMenu>

        <AppMain>{children}</AppMain>

        <AppFooter>
          <Div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <FooterBrand copyright={t('footer.copyright', { year: new Date().getFullYear() })}>
              <Div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Span>
                  {t('footer.createdWith')} ❤️ {t('footer.by')}{' '}
                </Span>
                <Link
                  target="_blank"
                  href="https://www.linkedin.com/in/franck-seradni/"
                  className="hover:underline"
                >
                  @Franck
                </Link>
              </Div>
            </FooterBrand>
            <Div className="flex items-center gap-3">
              <Link href="/legal-notices" className="text-xs text-muted-foreground hover:underline">
                {t('footer.legalNotices')}
              </Link>
              <Link
                href="https://github.com/DFranck/ez-start"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-muted-foreground hover:opacity-80"
              >
                <Icon name="fa:FaGithub" size={16} />
              </Link>
              <Link
                href="mailto:support@ezstart.xyz"
                className="text-muted-foreground hover:opacity-80"
                aria-label="Email"
              >
                <Icon name="fa:FaEnvelope" size={16} />
              </Link>
            </Div>
          </Div>
        </AppFooter>
      </AppLayout>
      {isMobile && (
        <SignedIn>
          <PWAInstallPrompt
            appName={t('pwa.install.title')}
            description={t('pwa.install.description')}
            installButtonText={t('pwa.install.installButton')}
            laterButtonText={t('pwa.install.laterButton')}
            // showInDev
          />
        </SignedIn>
      )}
    </>
  )
}

export default ClientLayout
