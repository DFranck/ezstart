'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { Button, H1, Header, Icon, Main } from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { useTheme } from 'next-themes'
import Link from 'next/link'
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
  const { isAuthenticated, login } = useAuth()
  const { theme } = useTheme()

  return (
    <>
      <Header
        position="sticky"
        leftContent={
          <div className="flex items-center space-x-4">
            <Link
              href={isAuthenticated ? '/dashboard' : '/'}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Icon name="lucide:Receipt" className="w-5 h-5 text-white" />
              </div>
              <div>
                <H1
                  size={'h5'}
                  className="text-start w-fit font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent"
                >
                  EZBill
                </H1>
                <p className="text-xs text-gray-500 -mt-1">Professional Billing</p>
              </div>
            </Link>
          </div>
        }
        rightContent={
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isAuthenticated ? (
              <>
                {showLogoutButton && (
                  <Button
                    onClick={() => {
                      localStorage.clear()
                      window.location.href = '/'
                    }}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Icon name="lucide:LogOut" className="w-4 h-4 sm:mr-2" />
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
                className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <>
                  <Icon name="lucide:LogIn" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Get Started</span>
                </>
              </Button>
            )}
            <ThemeSwitcher />
          </div>
        }
      />
      <Main className="px-2 md:px-6">{children}</Main>
    </>
  )
}

export default ClientLayout
