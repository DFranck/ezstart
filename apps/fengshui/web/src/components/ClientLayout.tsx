'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { Button, H1, Header, Icon, Main } from '@ezstart/ui/components'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

type ClientLayoutProps = {
  children: ReactNode
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const { isAuthenticated, login, logout } = useAuth()
  const { theme } = useTheme()
  const pathname = usePathname()
  const isAnalyzePage = pathname === '/analyze'
  const position = 'fixed'
  return (
    <>
      <Header
        position={position}
        leftContent={
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-ezstart to-info rounded-xl flex items-center justify-center">
                <span className="text-2xl">🏮</span>
              </div>
              <div>
                <H1
                  size={'h5'}
                  className="text-start w-fit font-bold bg-gradient-to-r from-ezstart to-info bg-clip-text text-transparent"
                >
                  Feng Shui Bagua
                </H1>
                <p className="text-xs text-muted-foreground -mt-1">Harmonisez votre espace</p>
              </div>
            </Link>
          </div>
        }
        rightContent={
          <div className="flex items-center space-x-2 sm:space-x-3">
            {!isAnalyzePage && (
              <Link href="/analyze">
                <Button variant="outline" size="sm">
                  <Icon name="lucide:Sparkles" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Analyser</span>
                </Button>
              </Link>
            )}
            {/* {isAuthenticated ? (
              <Button onClick={logout} variant="outline" size="sm">
                <Icon name="lucide:LogOut" className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            ) : (
              <Button onClick={() => login({ theme: theme || 'system' })} size="sm">
                <Icon name="lucide:LogIn" className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Connexion</span>
              </Button>
            )} */}
            <ThemeSwitcher />
          </div>
        }
      />
      <Main withHeaderOffset={position === 'fixed' || position === 'sticky' ? true : false}>
        {children}
      </Main>
    </>
  )
}

export default ClientLayout
