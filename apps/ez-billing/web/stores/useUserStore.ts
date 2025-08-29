import { callApi } from '@ezstart/ui/utils'
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
        const getRes = await callApi<UserResponse>(`/api/users/${trimmedUsername}`, {
          method: 'GET',
        })

        if (getRes.ok && getRes.data) {
          const user = getRes.data.user
          set({ user })
          return user
        }

        // If user doesn't exist, create new one
        const createRes = await callApi<UserResponse>('/api/users', {
          method: 'POST',
          body: { username: trimmedUsername },
        })

        if (!createRes.ok || !createRes.data) throw new Error('Failed to register user')
        const user = createRes.data.user
        set({ user })
        return user
      },

      reset: () => set({ user: null }),
    }),
    {
      name: 'ez-billing-user',
      partialize: state => ({ user: state.user }),
    }
  )
)