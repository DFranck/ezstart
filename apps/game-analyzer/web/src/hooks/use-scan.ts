import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GameType, Scan, ScanResult } from '@game-analyzer/types'
import { callApi } from '@/config/api'

interface ScanInput {
  image: File
  gameType: GameType
}

export function useScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ image, gameType }: ScanInput): Promise<ScanResult> => {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('gameType', gameType)

      const response = await callApi<{ success: boolean; data: Scan }>('/scan', {
        method: 'POST',
        body: formData,
      })

      // API returns { success, data: { _id, gameType, status, result: ScanResult } }
      // Return result directly so consumers get { success, data, rawText, confidence, analysis }
      return response.data!.data.result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })
}
