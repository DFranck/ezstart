// @/stores/playerStore.ts
import { callApi, parseApiError } from '@/utils/api'
import { Player, PlayerResponse } from '@tower-defense/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PlayerStore = {
  player: Player | null
  register: (name: string, userId: string) => Promise<Player>
  reset: () => void
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    set => ({
      player: null,

      register: async (name: string, userId: string) => {
        const res = await callApi<PlayerResponse>('/players', {
          method: 'POST',
          body: { name, userId },
        })

        if (!res.ok) throw new Error(parseApiError(res.data))
        if (!res.data) throw new Error('No data returned from API')
        const player = res.data.player
        set({ player })
        return player
      },

      reset: () => set({ player: null }),
    }),
    {
      name: 'player',
      partialize: state => ({ player: state.player }), // uniquement le player
    }
  )
)
