import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi } from '@/config/api'

interface GameLayoutData {
  gameType: string
  layoutName: string
  displayName?: string
  bestPresets: string[]
  zones: Record<string, unknown>
  masks: Record<string, unknown>
  roi: Record<string, unknown>
  updatedAt: string
}

type GameLayoutsResponse = GameLayoutData[]

type GameLayoutResponse = GameLayoutData | null

/** List all layouts for a game */
export function useGameLayouts(gameType: string) {
  return useQuery({
    queryKey: ['game-layouts', gameType],
    queryFn: async () => {
      const response = await callApi<GameLayoutsResponse>(`/config/${gameType}`)
      return response.ok ? response.data : []
    },
    staleTime: 1000 * 60 * 60,
  })
}

/** Load a specific layout */
export function useGameLayout(gameType: string, layoutName: string) {
  return useQuery({
    queryKey: ['game-layout', gameType, layoutName],
    queryFn: async () => {
      const response = await callApi<GameLayoutResponse>(`/config/${gameType}/${layoutName}`)
      return response.ok ? response.data : null
    },
    enabled: !!layoutName,
    staleTime: 1000 * 60 * 60,
  })
}

interface SaveGameLayoutInput {
  displayName?: string
  bestPresets?: string[]
  zones?: Record<string, unknown>
  masks?: Record<string, unknown>
  roi?: Record<string, unknown>
}

/** Save/update a layout */
export function useSaveGameLayout(gameType: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ layoutName, ...input }: SaveGameLayoutInput & { layoutName: string }) => {
      const response = await callApi<GameLayoutResponse>(`/config/${gameType}/${layoutName}`, {
        method: 'PUT',
        body: input,
      })
      return response.ok ? response.data : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-layouts', gameType] })
      queryClient.invalidateQueries({ queryKey: ['game-layout', gameType] })
    },
  })
}

/** Delete a layout */
export function useDeleteGameLayout(gameType: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (layoutName: string) => {
      await callApi(`/config/${gameType}/${layoutName}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-layouts', gameType] })
      queryClient.invalidateQueries({ queryKey: ['game-layout', gameType] })
    },
  })
}

// --- Legacy hooks for backward compatibility ---

interface GameConfigData {
  gameType: string
  bestPresets: string[]
  zones: any
  masks: any
  updatedAt: string
}

type GameConfigResponse = GameConfigData | null

/** @deprecated Use useGameLayouts + useGameLayout instead */
export function useGameConfig(gameType: string) {
  return useQuery({
    queryKey: ['game-config', gameType],
    queryFn: async () => {
      // Load the first layout as the "default" config for backward compat
      const response = await callApi<GameLayoutsResponse>(`/config/${gameType}`)
      const layouts = response.ok ? response.data : []
      return layouts.length > 0 ? layouts[0] : null
    },
    staleTime: 1000 * 60 * 60,
  })
}

interface SaveGameConfigInput {
  bestPresets?: string[]
  zones?: Record<string, unknown>
  masks?: Record<string, unknown>
}

/** @deprecated Use useSaveGameLayout instead */
export function useSaveGameConfig(gameType: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveGameConfigInput) => {
      const response = await callApi<GameConfigResponse>(`/config/${gameType}/default`, {
        method: 'PUT',
        body: input,
      })
      return response.ok ? response.data : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-config', gameType] })
      queryClient.invalidateQueries({ queryKey: ['game-layouts', gameType] })
    },
  })
}
