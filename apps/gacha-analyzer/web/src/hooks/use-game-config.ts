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

/** List all layouts for a game */
export function useGameLayouts(gameType: string) {
  return useQuery({
    queryKey: ['game-layouts', gameType],
    queryFn: () => callApi<GameLayoutsResponse>(`/config/${gameType}`),
    staleTime: 1000 * 60 * 60,
  })
}

/** Load a specific layout */
export function useGameLayout(gameType: string, layoutName: string) {
  return useQuery({
    queryKey: ['game-layout', gameType, layoutName],
    queryFn: () => callApi<GameLayoutData | null>(`/config/${gameType}/${layoutName}`),
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
    mutationFn: ({ layoutName, ...input }: SaveGameLayoutInput & { layoutName: string }) =>
      callApi<GameLayoutData | null>(`/config/${gameType}/${layoutName}`, {
        method: 'PUT',
        body: input,
      }),
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
    mutationFn: (layoutName: string) =>
      callApi(`/config/${gameType}/${layoutName}`, {
        method: 'DELETE',
      }),
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
  zones: Record<string, unknown>
  masks: Record<string, unknown>
  updatedAt: string
}

type GameConfigResponse = GameConfigData | null

/** @deprecated Use useGameLayouts + useGameLayout instead */
export function useGameConfig(gameType: string) {
  return useQuery({
    queryKey: ['game-config', gameType],
    queryFn: async () => {
      // Load the first layout as the "default" config for backward compat
      const layouts = await callApi<GameLayoutsResponse>(`/config/${gameType}`)
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
    mutationFn: (input: SaveGameConfigInput) =>
      callApi<GameConfigResponse>(`/config/${gameType}/default`, {
        method: 'PUT',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-config', gameType] })
      queryClient.invalidateQueries({ queryKey: ['game-layouts', gameType] })
    },
  })
}
