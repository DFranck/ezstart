'use client'
import { createContext, ReactNode, useContext, useEffect } from 'react'
import { AuthClient, createAuthClient } from './client.js'
import { useAuthStore, type AuthMode } from './store.js'
import { getCurrentEnvironment, isEzstartDomain } from '@ezstart/config'

interface AuthContextValue {
  client: AuthClient
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  appName: string
  authMode?: AuthMode  // 🆕 Replaces useHttpOnlyCookies (default: 'localStorage')
  jwtPublicKey?: string  // 🆕 Required if authMode='jwt'

  // @deprecated Use authMode instead
  useHttpOnlyCookies?: boolean
}

/**
 * Determine the actual auth mode to use based on environment and configuration
 *
 * Auto-detection rules:
 * 1. localhost → Always localStorage (httpOnly doesn't work cross-port)
 * 2. production + ezstart domain + httpOnly → httpOnly
 * 3. production + external domain + httpOnly → Warning + fallback localStorage
 * 4. production + jwt → jwt
 */
function resolveAuthMode(
  configuredMode: AuthMode,
  hostname: string,
  env: string,
  jwtPublicKey?: string
): AuthMode {
  // Rule 1: Force localStorage in localhost
  if (env === 'local') {
    if (configuredMode !== 'localStorage') {
      console.warn(
        `⚠️ [AuthSDK] Forced localStorage mode in localhost`,
        `\n  → Configured: ${configuredMode}`,
        `\n  → Reason: httpOnly/jwt cookies don't work cross-port`,
        `\n  → Domain: ${hostname}`
      )
    }
    return 'localStorage'
  }

  // Rule 2: httpOnly on ezstart domain (OK)
  if (configuredMode === 'httpOnly' && isEzstartDomain(hostname)) {
    console.log(
      `✅ [AuthSDK] httpOnly mode on ezstart domain`,
      `\n  → Domain: ${hostname}`,
      `\n  → Cookie: .ezstart.xyz`
    )
    return 'httpOnly'
  }

  // Rule 3: httpOnly on external domain (Warning + fallback)
  if (configuredMode === 'httpOnly' && !isEzstartDomain(hostname)) {
    console.warn(
      `⚠️ [AuthSDK] httpOnly mode on non-ezstart domain!`,
      `\n  → Domain: ${hostname}`,
      `\n  → httpOnly only works on *.ezstart.xyz`,
      `\n  → Falling back to localStorage`,
      `\n  → Consider using authMode="jwt" for external domains`
    )
    return 'localStorage'
  }

  // Rule 4: JWT mode (validate publicKey)
  if (configuredMode === 'jwt') {
    if (!jwtPublicKey) {
      console.error(
        `❌ [AuthSDK] JWT mode requires jwtPublicKey!`,
        `\n  → Add: jwtPublicKey={process.env.NEXT_PUBLIC_EZAUTH_JWT_KEY}`,
        `\n  → Falling back to localStorage`
      )
      return 'localStorage'
    }
    console.log(
      `✅ [AuthSDK] JWT mode enabled`,
      `\n  → Domain: ${hostname}`,
      `\n  → Validation: Local (no API calls)`
    )
    return 'jwt'
  }

  // Rule 5: localStorage (warning in production)
  if (configuredMode === 'localStorage' && env === 'production') {
    console.warn(
      `⚠️ [AuthSDK] localStorage mode in production`,
      `\n  → Domain: ${hostname}`,
      `\n  → Warning: Vulnerable to XSS attacks`,
      `\n  → Consider authMode="httpOnly" or "jwt"`
    )
  }

  return configuredMode
}

export function AuthProvider({
  children,
  appName,
  authMode = 'localStorage',
  jwtPublicKey,
  useHttpOnlyCookies // deprecated
}: AuthProviderProps) {
  const store = useAuthStore()

  // Handle deprecated prop
  if (useHttpOnlyCookies !== undefined) {
    console.warn(
      `⚠️ [AuthSDK] useHttpOnlyCookies is deprecated`,
      `\n  → Use authMode="httpOnly" instead`,
      `\n  → Old: useHttpOnlyCookies={true}`,
      `\n  → New: authMode="httpOnly"`
    )
    authMode = useHttpOnlyCookies ? 'httpOnly' : 'localStorage'
  }

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

  // Auto-detect and set mode on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hostname = window.location.hostname
    const env = getCurrentEnvironment()

    // Resolve actual mode based on environment
    const resolvedMode = resolveAuthMode(authMode, hostname, env, jwtPublicKey)
    const currentMode = store.getMode()

    // Update mode if it changed
    if (currentMode !== resolvedMode) {
      console.log(
        `🔄 [AuthSDK] Switching auth mode`,
        `\n  → From: ${currentMode}`,
        `\n  → To: ${resolvedMode}`,
        `\n  → App: ${appName}`
      )

      if (store.isAuthenticated) {
        // Re-authenticate user with new mode
        const user = store.user
        if (user) {
          store.setAuth(user, store.accessToken || undefined, resolvedMode)
        }
      }
    }
  }, [authMode, appName, jwtPublicKey, store])

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
