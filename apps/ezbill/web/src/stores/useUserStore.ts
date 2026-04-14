import { ApiError } from '@ezstart/api-sdk'
import { callApi } from '@/config/api'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type User = {
  _id: string
  username: string
  createdAt: string
  updatedAt: string
}

type UserResponse = {
  user: User
}

type UserStore = {
  user: User | null
  register: (username: string) => Promise<User>
  reset: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    set => ({
      user: null,

      register: async (username: string) => {
        const trimmedUsername = username.toLowerCase().trim()

        // First try to get existing user
        try {
          const getRes = await callApi<UserResponse>(`/users/${trimmedUsername}`, {
            method: 'GET',
          })
          if (getRes?.user) {
            set({ user: getRes.user })
            return getRes.user
          }
        } catch (err: unknown) {
          // 404 is expected when user doesn't exist — fall through to create
          if (!ApiError.isApiError(err) || err.status !== 404) {
            throw err
          }
        }

        // If user doesn't exist, create new one
        const createRes = await callApi<UserResponse>('/users', {
          method: 'POST',
          body: { username: trimmedUsername },
        })

        if (!createRes?.user) throw new Error('No data returned from API')
        const user = createRes.user
        set({ user })
        return user
      },

      reset: () => set({ user: null }),
    }),
    {
      name: 'ezbill-user',
      partialize: state => ({ user: state.user }),
    }
  )
)
