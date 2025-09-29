'use client'

import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { useAuth } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import {
  ClientLayout as BaseClientLayout,
  Button,
  H1,
  Icon,
  LocaleSwitcher,
  P,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { ReactNode } from 'react'

type ClientLayoutProps = {
  children: ReactNode
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const { isAuthenticated, login, logout } = useAuth()
  const { theme } = useTheme()
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const isAnalyzePage = pathname === '/analyze'

  const locales = ['fr', 'en', 'es']

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <BaseClientLayout
      className={cn(isAnalyzePage && 'mb-18')}
      appName="Feng Shui Bagua"
      creator={
        <div className="flex items-center gap-2">
          <span>Made with ❤️ by </span>
          <Link target="_blank" href="https://www.linkedin.com/in/ambre-seradni-26489491/">
            @Ambre
          </Link>
          <Link target="_blank" href="https://ezstart-web.vercel.app/fr">
            @Franck
          </Link>
        </div>
      }
      currentPath={pathname}
      headerLeftContent={
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🏮</span>
            <div>
              <H1
                size={'h5'}
                className="text-start w-fit font-bold bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent"
              >
                Feng Shui Bagua
              </H1>
              <P className="text-xs text-muted-foreground -mt-1 line-clamp-1">
                {t('hero.subtitle')}
              </P>
            </div>
          </Link>
        </div>
      }
      headerRightContent={
        <div className="flex items-center gap-2">
          {!isAnalyzePage && (
            <Link href="/analyze">
              <Button variant="outline" size="sm">
                <Icon name="lucide:Sparkles" className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.analyze')}</span>
              </Button>
            </Link>
          )}
          {/* <LoginButton>{isAuthenticated ? t('common.logout') : t('common.login')}</LoginButton> */}
          <LocaleSwitcher
            locales={locales}
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
          />
          <ThemeSwitcher />
        </div>
      }
      LinkComponent={Link}
    >
      {children}
    </BaseClientLayout>
  )
}

export default ClientLayout
