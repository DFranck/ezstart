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
  /** Base64 JPEG thumbnail of the cropped area */
  thumbnail?: string
  zoneSetSlot?: File
  zoneMainStat?: File
  zoneQuality?: File
  zoneInnate?: File
  zoneSub1?: File
  zoneSub2?: File
  zoneSub3?: File
  zoneSub4?: File
}

export function useScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ image, imageAlt, imageFull, gameType, profile, benchMode, presets, thumbnail, zoneSetSlot, zoneMainStat, zoneQuality, zoneInnate, zoneSub1, zoneSub2, zoneSub3, zoneSub4 }: ScanInput): Promise<ScanResult> => {
      const formData = new FormData()
      formData.append('image', image)
      if (imageAlt) formData.append('imageAlt', imageAlt)
      if (imageFull) formData.append('imageFull', imageFull)
      formData.append('gameType', gameType)
      if (profile) formData.append('profile', profile)
      if (benchMode !== undefined) formData.append('benchMode', String(benchMode))
      if (presets && presets.length > 0) formData.append('presets', JSON.stringify(presets))
      if (thumbnail) formData.append('thumbnail', thumbnail)
      if (zoneSetSlot) formData.append('zoneSetSlot', zoneSetSlot)
      if (zoneMainStat) formData.append('zoneMainStat', zoneMainStat)
      if (zoneQuality) formData.append('zoneQuality', zoneQuality)
      if (zoneInnate) formData.append('zoneInnate', zoneInnate)
      if (zoneSub1) formData.append('zoneSub1', zoneSub1)
      if (zoneSub2) formData.append('zoneSub2', zoneSub2)
      if (zoneSub3) formData.append('zoneSub3', zoneSub3)
      if (zoneSub4) formData.append('zoneSub4', zoneSub4)

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
