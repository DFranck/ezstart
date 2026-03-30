'use client'

import { useNavLinks } from '@/hooks/useNavLinks'
import { LoginButton, RequireAuth, useAuth } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
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
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'

type ClientLayoutProps = {
  children: ReactNode
}

const ClientLayout = ({ children }: ClientLayoutProps): React.JSX.Element => {
  const { isAuthenticated } = useAuth()
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
            <LoginButton>{isAuthenticated ? t('auth.logout') : t('auth.login')}</LoginButton>
            <LocaleSwitcher
              locales={locales}
              currentLocale={currentLocale}
              onLocaleChange={handleLocaleChange}
            />
            <ThemeSwitcher />
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
