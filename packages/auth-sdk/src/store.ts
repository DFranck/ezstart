import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from './types.js'

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