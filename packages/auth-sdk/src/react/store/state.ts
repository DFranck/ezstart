'use client'

import { create, type StoreApi } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthMode, AuthUser } from '../../core/types.js'

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  mode: AuthMode
  isLoggingIn: boolean
  isLoggingOut: boolean
  isAuthReady: boolean

  // Actions
  setAuth: (user: AuthUser, accessToken?: string, mode?: AuthMode, refreshToken?: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
  getMode: () => AuthMode
  setLoggingIn: (isLoggingIn: boolean) => void
  setLoggingOut: (isLoggingOut: boolean) => void
}

/**
 * Create the base zustand store (state + actions + persist middleware) for the
 * auth store. The cross-tab broadcast wiring is layered on afterwards by
 * `attachCrossTabSync` in {@link createAuthStore}.
 *
 * @internal — composed by `createAuthStore`, not exported from the package.
 */
export function createBaseAuthStore(options: {
  initialUser: AuthUser | null
  storageKey: string
}): StoreApi<AuthState> {
  const { initialUser, storageKey } = options

  const baseStore = create<AuthState>()(
    persist(
      (set, get) => ({
        user: initialUser,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: !!initialUser,
        mode: 'localStorage', // Will be auto-detected on first use
        isLoggingIn: false,
        isLoggingOut: false,
        isAuthReady: !!initialUser,

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
            isLoggingOut: false,
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

        setLoggingOut: (isLoggingOut: boolean) => {
          set({ isLoggingOut })
        },
      }),
      {
        name: storageKey,
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
        onRehydrateStorage: () => rehydratedState => {
          // Mark auth as ready after zustand rehydrates from localStorage.
          // Also ensure isAuthenticated is true if the user was already authenticated
          // (covers edge cases where the callback fires late or not at all).
          //
          // Important: if `initialUser` was provided to the factory, the store
          // already booted with `isAuthReady: true` and a user. The persist
          // middleware will overwrite that with whatever is in localStorage —
          // which in httpOnly mode is empty and would clobber the SSR user.
          // Restore from initialUser when the rehydrated payload is empty.
          baseStore.setState(prev => ({
            ...prev,
            isAuthReady: true,
            ...(rehydratedState?.isAuthenticated && rehydratedState?.user
              ? { isAuthenticated: true }
              : initialUser && !rehydratedState?.user
                ? {
                    user: initialUser,
                    isAuthenticated: true,
                  }
                : {}),
          }))
        },
      }
    )
  )

  return baseStore
}
