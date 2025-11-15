'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import type { AuthUser } from './types.js'

export type AuthMode = 'localStorage' | 'httpOnly' | 'jwt'

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  mode: AuthMode
  isLoggingIn: boolean

  // Actions
  setAuth: (user: AuthUser, accessToken?: string, mode?: AuthMode) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
  getMode: () => AuthMode
  setLoggingIn: (isLoggingIn: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      mode: 'localStorage', // Will be auto-detected on first use
      isLoggingIn: false,

      setAuth: (user: AuthUser, accessToken?: string, mode: AuthMode = 'localStorage') => {
        set({
          user,
          accessToken: mode === 'localStorage' ? accessToken : null, // Only store token for localStorage mode
          isAuthenticated: true,
          mode,
          isLoggingIn: false
        })
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          mode: 'localStorage' // Reset to default
        })
      },

      updateUser: (user: AuthUser) => {
        set((state) => ({
          ...state,
          user
        }))
      },

      getMode: () => get().mode,

      setLoggingIn: (isLoggingIn: boolean) => {
        set({ isLoggingIn })
      }
    }),
    {
      name: 'ezauth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        mode: state.mode
      })
    }
  )
)

// Expose store globally for cross-package access (e.g., @ezstart/ui ThemeEditor)
if (typeof window !== 'undefined') {
  (window as any).__ezauth_store__ = useAuthStore

  // Cross-tab/cross-app synchronization (for localhost development)
  // Only create BroadcastChannel if available (not in Edge Runtime)
  const authChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('ezauth-sync')
    : null

  // Listen for auth changes from other tabs/apps
  if (authChannel) {
    authChannel.onmessage = (event) => {
      const { type, user, accessToken, mode } = event.data

      if (type === 'LOGIN') {
        useAuthStore.getState().setAuth(user, accessToken, mode)
      } else if (type === 'LOGOUT') {
        useAuthStore.getState().logout()
      }
    }

    // Broadcast auth changes to other tabs/apps
    const originalSetAuth = useAuthStore.getState().setAuth
    const originalLogout = useAuthStore.getState().logout

    useAuthStore.setState({
      setAuth: (user, accessToken, mode) => {
        originalSetAuth(user, accessToken, mode)
        authChannel.postMessage({ type: 'LOGIN', user, accessToken, mode })
      },
      logout: () => {
        originalLogout()
        authChannel.postMessage({ type: 'LOGOUT' })
      }
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
      isAuthenticated: false,
      mode: 'localStorage' as AuthMode,
      setAuth: store.setAuth,
      logout: store.logout,
      updateUser: store.updateUser,
      getMode: store.getMode,
    }
  }

  return store
}