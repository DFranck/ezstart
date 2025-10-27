'use client'
import { createContext, ReactNode, useContext, useEffect } from 'react'
import { AuthClient, createAuthClient } from './client.js'
import { useAuthStore } from './store.js'

interface AuthContextValue {
  client: AuthClient
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  appName: string
  useHttpOnlyCookies?: boolean // ✅ NEW: Opt-in flag for httpOnly mode (default: false)
}

export function AuthProvider({ children, appName, useHttpOnlyCookies = false }: AuthProviderProps) {
  const store = useAuthStore()

  // Create client lazily to avoid SSR issues
  const getClient = () => {
    const redirectUri =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback'

    return createAuthClient({
      appName,
      redirectUri,
    })
  }

  const client = getClient()

  // Set mode on mount based on prop
  useEffect(() => {
    const currentMode = store.getMode()
    const targetMode = useHttpOnlyCookies ? 'httpOnly' : 'localStorage'

    // Update mode if it changed
    if (currentMode !== targetMode && store.isAuthenticated) {
      // Re-authenticate user with new mode
      const user = store.user
      if (user) {
        store.setAuth(user, store.accessToken || undefined, targetMode)
      }
    }
  }, [useHttpOnlyCookies, store])

  // Auto-verify token on mount and periodically (but NOT on callback pages)
  useEffect(() => {
    // Skip token verification on callback pages to avoid race conditions
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/callback')) {
      return
    }

    let intervalId: NodeJS.Timeout

    const verifyToken = async () => {
      const mode = store.getMode()

      if (mode === 'localStorage' && store.accessToken) {
        // localStorage mode: verify token from store
        const isValid = await client.verifyToken(store.accessToken)
        if (!isValid) {
          store.logout()
        }
      } else if (mode === 'httpOnly') {
        // httpOnly mode: try to fetch user from cookie
        try {
          const user = await client.getCurrentUser()
          if (user) {
            store.updateUser(user)
          }
        } catch (error) {
          // Cookie expired or invalid
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
  }, [store.accessToken, store.getMode, client, store])

  return <AuthContext.Provider value={{ client }}>{children}</AuthContext.Provider>
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

  const mode = store.getMode()

  const login = (additionalParams?: Record<string, string>): Promise<never> => {
    // Both modes use redirect for now (OAuth flow)
    client.redirectToLogin(additionalParams)
    // Return a promise that never resolves since we're redirecting
    return new Promise(() => {})
  }

  const register = (): Promise<never> => {
    client.redirectToRegister()
    // Return a promise that never resolves since we're redirecting
    return new Promise(() => {})
  }

  const handleCallback = async (code: string) => {
    try {
      const authResult = await client.exchangeCode(code)

      if (mode === 'httpOnly') {
        // httpOnly mode: token is in cookie, only store user
        store.setAuth(authResult.user, undefined, 'httpOnly')
      } else {
        // localStorage mode: store user + token
        store.setAuth(authResult.user, authResult.access_token, 'localStorage')
      }

      return authResult.user
    } catch (error) {
      console.error('Auth callback error:', error)
      throw error
    }
  }

  const logout = async () => {
    if (mode === 'httpOnly') {
      // httpOnly mode: call logout endpoint to clear cookie
      await client.logout()
    }
    // Clear local state for both modes
    store.logout()
  }

  const verifyAndRefresh = async () => {
    if (mode === 'localStorage' && store.accessToken) {
      try {
        const user = await client.getCurrentUser(store.accessToken)
        store.updateUser(user)
        return user
      } catch (error) {
        console.error('Failed to refresh user:', error)
        store.logout()
        throw error
      }
    } else if (mode === 'httpOnly') {
      try {
        const user = await client.getCurrentUser()
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
    mode, // ✅ Expose mode

    // Actions
    login,
    register,
    logout, // ✅ Now async and mode-aware
    handleCallback,
    verifyAndRefresh,
  }
}
