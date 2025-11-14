/**
 * AI Store - Zustand state management for AI SDK
 */
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AIProviderInfo {
  id: string
  name: string
  type: string
  enabled: boolean
  capabilities: any
  model?: string
}

interface AIStore {
  providers: AIProviderInfo[]
  selectedProvider: string | null
  setProviders: (providers: AIProviderInfo[]) => void
  setSelectedProvider: (id: string) => void
}

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      providers: [],
      selectedProvider: null,

      setProviders: (providers) => {
        const current = get().selectedProvider
        set({
          providers,
          // Auto-select first provider if none selected
          selectedProvider: current || providers[0]?.id || null,
        })
      },

      setSelectedProvider: (id) => set({ selectedProvider: id }),
    }),
    {
      name: 'ai-store',
    }
  )
)
