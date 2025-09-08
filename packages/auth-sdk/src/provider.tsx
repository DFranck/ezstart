import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { AuthClient, AuthClientConfig } from './client.js'
import { useAuthStore } from './store.js'

interface AuthContextValue {
  client: AuthClient
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  appName: string
}

export function AuthProvider({ children, appName }: AuthProviderProps) {
  // Auto-configuration based on environment
  const config: AuthClientConfig = {
    baseURL: process.env.NODE_ENV === 'production' 
      ? 'https://ezauth-oblm.onrender.com/api/auth'
      : 'http://localhost:8081/api/auth',
    appName,
    redirectUri: typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback'
  }
  
  const client = new AuthClient(config)
  const store = useAuthStore()

  // Auto-verify token on mount and periodically (but NOT on callback pages)
  useEffect(() => {
    // Skip token verification on callback pages to avoid race conditions
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
      return
    }

    let intervalId: NodeJS.Timeout

    const verifyToken = async () => {
      if (store.accessToken) {
        const isValid = await client.verifyToken(store.accessToken)
        if (!isValid) {
          store.logout()
        }
      }
    }

    // Verify immediately
    verifyToken()

    // Verify every 5 minutes
    intervalId = setInterval(verifyToken, 5 * 60 * 1000)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [store.accessToken, client, store])

  return (
    <AuthContext.Provider value={{ client }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

// Main auth hook
export function useAuth() {
  const { client } = useAuthContext()
  const store = useAuthStore()

  const login = () => {
    client.redirectToLogin()
  }

  const register = () => {
    client.redirectToRegister()
  }

  const handleCallback = async (code: string) => {
    try {
      const authResult = await client.exchangeCode(code)
      store.setAuth(authResult.user, authResult.access_token)
      return authResult.user
    } catch (error) {
      console.error('Auth callback error:', error)
      throw error
    }
  }

  const verifyAndRefresh = async () => {
    if (store.accessToken) {
      try {
        const user = await client.getCurrentUser(store.accessToken)
        store.updateUser(user)
        return user
      } catch (error) {
        console.error('Failed to refresh user:', error)
        store.logout()
        throw error
      }
    }
    return null
  }

  return {
    // State
    user: store.user,
    accessToken: store.accessToken,
    isAuthenticated: store.isAuthenticated,
    
    // Actions
    login,
    register,
    logout: store.logout,
    handleCallback,
    verifyAndRefresh
  }
}