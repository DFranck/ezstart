import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GameType, Scan, ScanResult } from '@game-analyzer/types'
import { callApi } from '@/config/api'

interface ScanInput {
  image: File
  imageAlt?: File
  imageFull?: File
  gameType: GameType
  profile?: string
  benchMode?: boolean
  presets?: string[]
}

export function useScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ image, imageAlt, imageFull, gameType, profile, benchMode, presets }: ScanInput): Promise<ScanResult> => {
      const formData = new FormData()
      formData.append('image', image)
      if (imageAlt) formData.append('imageAlt', imageAlt)
      if (imageFull) formData.append('imageFull', imageFull)
      formData.append('gameType', gameType)
      if (profile) formData.append('profile', profile)
      if (benchMode !== undefined) formData.append('benchMode', String(benchMode))
      if (presets && presets.length > 0) formData.append('presets', JSON.stringify(presets))

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
