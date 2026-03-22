import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GameType, Scan } from '@game-analyzer/types'
import { callApi } from '@/config/api'

interface ScanInput {
  image: File
  gameType: GameType
}

export function useScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ image, gameType }: ScanInput): Promise<Scan> => {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('gameType', gameType)

      const response = await callApi<Scan>('/scans', {
        method: 'POST',
        body: formData,
      })

      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })
}
