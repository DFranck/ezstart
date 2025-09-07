import { useState, useEffect, useContext, createContext, ReactNode, createElement } from 'react'
import { AuthClient, AuthUser } from './auth-client'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
  client: AuthClient
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  client: AuthClient
}

export function AuthProvider({ children, client }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      if (client.isAuthenticated()) {
        try {
          const currentUser = await client.getCurrentUser()
          setUser(currentUser)
        } catch (error) {
          console.error('Failed to get current user:', error)
          client.removeToken()
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [client])

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (code && window.location.pathname.includes('/auth/callback')) {
        try {
          const token = await client.exchangeCodeForToken(code)
          setUser(token.user)
          
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (error) {
          console.error('Token exchange failed:', error)
        }
      }
    }

    handleCallback()
  }, [client])

  const login = () => {
    client.login()
  }

  const logout = () => {
    client.logout()
    setUser(null)
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    client
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUser(): AuthUser | null {
  const { user } = useAuth()
  return user
}

export function useAuthToken(): string | null {
  const { client } = useAuth()
  return client.getToken()
}