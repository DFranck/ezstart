'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import type { AuthUser } from './types.js'

export type AuthMode = 'localStorage' | 'httpOnly' | 'jwt'

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  mode: AuthMode
  isLoggingIn: boolean
  isAuthReady: boolean

  // Actions
  setAuth: (user: AuthUser, accessToken?: string, mode?: AuthMode, refreshToken?: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
  getMode: () => AuthMode
  setLoggingIn: (isLoggingIn: boolean) => void
}

const DEFAULT_STORAGE_KEY = 'ezauth-storage'

let _storageKey = DEFAULT_STORAGE_KEY

/** Configure the localStorage key used by auth-sdk persist. Call before store hydration. */
export function configureAuthStorage(key: string) {
  _storageKey = key
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      mode: 'localStorage', // Will be auto-detected on first use
      isLoggingIn: false,
      isAuthReady: false,

      setAuth: (
        user: AuthUser,
        accessToken?: string,
        mode: AuthMode = 'localStorage',
        refreshToken?: string
      ) => {
        set({
          user,
          accessToken: mode === 'localStorage' ? (accessToken ?? null) : null,
          // In httpOnly mode the refresh token lives in a server-side cookie;
          // never hold it in JS memory or localStorage.
          refreshToken: mode === 'localStorage' ? (refreshToken ?? null) : null,
          isAuthenticated: true,
          mode,
          isLoggingIn: false,
        })
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set(state => ({
          ...state,
          accessToken: state.mode === 'localStorage' ? accessToken : null,
          refreshToken: state.mode === 'localStorage' ? refreshToken : null,
        }))
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          mode: 'localStorage', // Reset to default
        })
      },

      updateUser: (user: AuthUser) => {
        set(state => ({
          ...state,
          user,
        }))
      },

      getMode: () => get().mode,

      setLoggingIn: (isLoggingIn: boolean) => {
        set({ isLoggingIn })
      },
    }),
    {
      name: _storageKey,
      partialize: state => ({
        user: state.user,
        // Only persist accessToken in localStorage mode.
        accessToken: state.mode === 'localStorage' ? state.accessToken : null,
        // httpOnly mode stores the refresh token in a server-side cookie — NEVER
        // mirror it to localStorage (XSS would otherwise hand an attacker a
        // long-lived credential).
        refreshToken: state.mode === 'localStorage' ? state.refreshToken : null,
        isAuthenticated: state.isAuthenticated,
        mode: state.mode,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isAuthReady: true })
      },
    }
  )
)

// Cross-tab/cross-app synchronization (for localhost development)
if (typeof window !== 'undefined') {
  // Only create BroadcastChannel if available (not in Edge Runtime)
  const authChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ezauth-sync') : null

  // Listen for auth changes from other tabs/apps
  if (authChannel) {
    authChannel.onmessage = event => {
      const { type, user, accessToken, mode, refreshToken } = event.data

      if (type === 'LOGIN') {
        useAuthStore.getState().setAuth(user, accessToken, mode, refreshToken)
      } else if (type === 'LOGOUT') {
        useAuthStore.getState().logout()
      }
    }

    // Broadcast auth changes to other tabs/apps
    const originalSetAuth = useAuthStore.getState().setAuth
    const originalLogout = useAuthStore.getState().logout

    useAuthStore.setState({
      setAuth: (user, accessToken, mode, refreshToken) => {
        originalSetAuth(user, accessToken, mode, refreshToken)
        authChannel.postMessage({ type: 'LOGIN', user, accessToken, mode, refreshToken })
      },
      logout: () => {
        originalLogout()
        authChannel.postMessage({ type: 'LOGOUT' })
      },
    })
  }
}

// SSR-safe hook that waits for hydration
export function useAuthStoreSSR() {
  const [mounted, setMounted] = useState(false)
  const store = useAuthStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Return default state during SSR
  if (!mounted) {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isAuthReady: false,
      mode: 'localStorage' as AuthMode,
      setAuth: store.setAuth,
      setTokens: store.setTokens,
      logout: store.logout,
      updateUser: store.updateUser,
      getMode: store.getMode,
    }
  }

  return store
}
