'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import type { AuthUser } from './types'

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  
  // Actions
  setAuth: (user: AuthUser, accessToken: string) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user: AuthUser, accessToken: string) => {
        set({
          user,
          accessToken,
          isAuthenticated: true
        })
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false
        })
      },

      updateUser: (user: AuthUser) => {
        set((state) => ({
          ...state,
          user
        }))
      }
    }),
    {
      name: 'ezauth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated
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
      setAuth: store.setAuth,
      logout: store.logout,
      updateUser: store.updateUser,
    }
  }
  
  return store
}