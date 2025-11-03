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

  // Actions
  setAuth: (user: AuthUser, accessToken?: string, mode?: AuthMode) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
  getMode: () => AuthMode
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      mode: 'localStorage', // Default to localStorage for backward compatibility

      setAuth: (user: AuthUser, accessToken?: string, mode: AuthMode = 'localStorage') => {
        set({
          user,
          accessToken: mode === 'localStorage' ? accessToken : null, // Only store token for localStorage mode
          isAuthenticated: true,
          mode
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

      getMode: () => get().mode
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