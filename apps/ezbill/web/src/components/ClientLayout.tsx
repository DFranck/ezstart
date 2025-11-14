'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import {
  ClientLayout as BaseClientLayout,
  Button,
  H1,
  Icon,
  PWAInstallPrompt,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

type ClientLayoutProps = {
  children: ReactNode
  showSettingsButton?: boolean
  showLogoutButton?: boolean
}

const ClientLayout = ({
  children,
  showSettingsButton = false,
  showLogoutButton = false,
}: ClientLayoutProps) => {
  const { isAuthenticated, login, logout } = useAuth()
  const { theme } = useTheme()
  const pathname = usePathname()
  const t = useTranslations()

  // Navigation links pour users authentifiés
  const navLinks: any[] = isAuthenticated
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: 'lucide:LayoutDashboard' },
        { href: '/dashboard/settings', label: 'Settings', icon: 'lucide:Settings' },
      ]
    : []

  return (
    <BaseClientLayout
      appName="EZBill"
      currentPath={pathname}
      headerPosition="sticky"
      mobileLogoIcon="custom:Ezbill"
      mobileLogoHref={'/'}
      headerLeftContent={
        <div className="flex items-center space-x-4">
          <Link
            href={'/'}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Icon name="custom:Ezbill" size={30} />
            <div>
              <H1
                size={'h5'}
                className="text-start w-fit font-bold bg-gradient-to-r from-ezbill-client to-ezbill-invoice bg-clip-text text-transparent"
              >
                EZBill
              </H1>
              <p className="text-xs text-muted-foreground -mt-1">Professional Billing</p>
            </div>
          </Link>
        </div>
      }
      navLinks={navLinks}
      headerRightContent={
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isAuthenticated ? (
            <>
              {showLogoutButton && (
                <Button
                  onClick={() => {
                    localStorage.clear()
                    window.location.href = '/'
                  }}
                  variant="destructive"
                  className="font-medium px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-200"
                >
                  <Icon name="lucide:LogOut" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={() => {
                // Passer le thème actuel à EZAuth via les paramètres URL
                login({ theme: theme || 'system' })
              }}
              className="font-medium px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-200"
            >
              <>
                <Icon name="lucide:LogIn" className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Get Started</span>
              </>
            </Button>
          )}
          <ThemeSwitcher />
        </div>
      }
      LinkComponent={Link}
      showFooter={true}
      footerShowCopyright={true}
      creator={
        <>
          Made by
          <a
            href="https://ezstart-web.vercel.app/fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline ml-2"
          >
            DFranck
          </a>
        </>
      }
      footerLayout="simple"
    >
      {children}
      <PWAInstallPrompt
        appName={'EzBill'}
        description={t('pwa.install.description')}
        installButtonText={t('pwa.install.installButton')}
        laterButtonText={t('pwa.install.laterButton')}
      />
    </BaseClientLayout>
  )
}

export default ClientLayout
