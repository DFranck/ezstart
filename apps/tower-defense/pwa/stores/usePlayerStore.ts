// @/stores/playerStore.ts
import { callApi } from '@ezstart/ui/utils'
import { Player, PlayerResponse } from '@tower-defense/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PlayerStore = {
  player: Player | null
  register: (name: string, userId?: string) => Promise<Player>
  reset: () => void
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    set => ({
      player: null,

      register: async (name: string, userId?: string) => {
        const res = await callApi<PlayerResponse>('/api/players', {
          method: 'POST',
          body: { name, userId },
        })

        if (!res.ok || !res.data) throw new Error('Failed to register player')
        const player = res.data.player
        set({ player })
        return player
      },

      reset: () => set({ player: null }),
    }),
    {
      name: 'tower-defense-player',
      partialize: state => ({ player: state.player }), // uniquement le player
    }
  )
)
