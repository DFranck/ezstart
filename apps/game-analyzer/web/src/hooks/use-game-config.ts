import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi } from '@/config/api'

interface GameConfigData {
  gameType: string
  bestPresets: string[]
  zones: any
  masks: any
  updatedAt: string
}

interface GameConfigResponse {
  success: boolean
  data: GameConfigData | null
}

export function useGameConfig(gameType: string) {
  return useQuery({
    queryKey: ['game-config', gameType],
    queryFn: async () => {
      const response = await callApi<GameConfigResponse>(`/config/${gameType}`)
      return response.data?.data ?? null
    },
    staleTime: 1000 * 60 * 60, // 1h
  })
}

interface SaveGameConfigInput {
  bestPresets?: string[]
  zones?: any
  masks?: any
}

export function useSaveGameConfig(gameType: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveGameConfigInput) => {
      const response = await callApi<GameConfigResponse>(`/config/${gameType}`, {
        method: 'PUT',
        body: input,
      })
      return response.data?.data ?? null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-config', gameType] })
    },
  })
}
