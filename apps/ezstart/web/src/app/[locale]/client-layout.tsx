'use client'

import { useNavLinks } from '@/hooks/useNavLinks'
import { LoginButton, useAuth } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import {
  ClientLayout as BaseClientLayout,
  H2,
  Icon,
  LocaleSwitcher,
  PWAInstallPrompt,
  type NavigationLink,
} from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'

type ClientLayoutProps = {
  children: ReactNode
}

const ClientLayout = ({ children }: ClientLayoutProps): any => {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations()

  // SSR-safe locale handling
  let currentLocale = 'en'
  try {
    currentLocale = useLocale()
  } catch (error) {
    console.warn('useLocale failed, using fallback:', error)
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
          <div className="flex items-center gap-2">
            <span>
              {t('footer.createdWith')} ❤️ {t('footer.by')}{' '}
            </span>
            <Link
              target="_blank"
              href="https://www.linkedin.com/in/franck-seradni/"
              className="hover:underline"
            >
              @Franck
            </Link>
          </div>
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
          <div className="flex items-center gap-2">
            <LoginButton>{isAuthenticated ? t('auth.logout') : t('auth.login')}</LoginButton>
            <LocaleSwitcher
              locales={locales}
              currentLocale={currentLocale}
              onLocaleChange={handleLocaleChange}
            />
            <ThemeSwitcher />
          </div>
        }
        // Footer customization
        footerLeftContent={
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center">
            <span className="text-xs opacity-70 select-none">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </span>
            <Link href={`/${currentLocale}/legal-notices`} className="hover:underline text-xs">
              {t('footer.legalNotices')}
            </Link>
          </div>
        }
        footerRightContent={
          <div className="flex gap-3 items-center">
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
          </div>
        }
        LinkComponent={Link}
      >
        {children}
      </BaseClientLayout>
      <PWAInstallPrompt
        appName={t('pwa.install.title')}
        description={t('pwa.install.description')}
        installButtonText={t('pwa.install.installButton')}
        laterButtonText={t('pwa.install.laterButton')}
        // showInDev
      />
    </>
  )
}

export default ClientLayout
