'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { ClientLayout as BaseClientLayout, Button, H1, Icon } from '@ezstart/ui/components'
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

  return (
    <BaseClientLayout
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
              <p className="text-xs text-muted-foreground -mt-1">Harmonisez votre espace</p>
            </div>
          </Link>
        </div>
      }
      headerRightContent={
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
      LinkComponent={Link}
    >
      {children}
    </BaseClientLayout>
  )
}

export default ClientLayout
