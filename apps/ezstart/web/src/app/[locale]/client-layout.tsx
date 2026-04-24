'use client'

import { useNavLinks } from '@/hooks/useNavLinks'
import { LoginButton, RequireAuth, SignedIn, SignedOut, UserMenu } from '@ezstart/auth-sdk'
import { getApiUrl } from '@ezstart/config'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import { useTheme } from 'next-themes'
import {
  ClientLayout as BaseClientLayout,
  Div,
  H2,
  Icon,
  LocaleSwitcher,
  PWAInstallPrompt,
  Span,
  type NavigationLink,
} from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { useDevice } from '@ezstart/ui/hooks'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'

type ClientLayoutProps = {
  children: ReactNode
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

  // Pages where header overlays content (hero/landing style)
  const isOverlayPage = pathname === `/${currentLocale}` || pathname === `/${currentLocale}/`

  // useNavLinks() format is already compatible with ClientLayout!
  const navLinks = useNavLinks() as NavigationLink[]
  const locales = ['en', 'fr']

  const handleLocaleChange = (newLocale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`)
    router.push(newPath)
  }

  return (
    <>
      <BaseClientLayout
        appName="EZStart"
        headerOverlay={isOverlayPage}
        mobileLogoIcon="custom:Ezstart"
        mobileLogoHref={`/${currentLocale}/`}
        creator={
          <Div className="flex items-center gap-2">
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
        }
        currentPath={pathname}
        headerLeftContent={
          <Link
            href={`/${currentLocale}/`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Icon name="custom:Ezstart" size={24} />
            <H2 size={'h4'}>EZStart</H2>
          </Link>
        }
        navLinks={navLinks}
        headerRightContent={
          <Div className="flex items-center gap-2">
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
              <UserMenu
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
          </Div>
        }
        // Footer customization
        footerLeftContent={
          <Div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center">
            <Span className="text-xs opacity-70 select-none">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </Span>
            <Link href={`/${currentLocale}/legal-notices`} className="hover:underline text-xs">
              {t('footer.legalNotices')}
            </Link>
          </Div>
        }
        footerRightContent={
          <Div className="flex gap-3 items-center">
            <Link
              href="https://github.com/DFranck/ez-start"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="hover:opacity-80"
            >
              <Icon name="fa:FaGithub" size={16} />
            </Link>
            <Link
              href="mailto:franckdufournet@hotmail.fr"
              className="hover:opacity-80"
              aria-label="Email"
            >
              <Icon name="fa:FaEnvelope" size={16} />
            </Link>
          </Div>
        }
        LinkComponent={Link}
      >
        {children}
      </BaseClientLayout>
      {isMobile && (
        <RequireAuth>
          <PWAInstallPrompt
            appName={t('pwa.install.title')}
            description={t('pwa.install.description')}
            installButtonText={t('pwa.install.installButton')}
            laterButtonText={t('pwa.install.laterButton')}
            // showInDev
          />
        </RequireAuth>
      )}
    </>
  )
}

export default ClientLayout
