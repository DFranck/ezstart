import { useQuery } from '@tanstack/react-query'
import type { GameType, Scan, ScanStatus } from '@game-analyzer/types'
import { callApi } from '@/config/api'

interface UseScansOptions {
  gameType?: GameType
  status?: ScanStatus
  limit?: number
}

export function useScans(options: UseScansOptions = {}) {
  const { gameType, status, limit } = options

  return useQuery({
    queryKey: ['scans', { gameType, status, limit }],
    queryFn: async (): Promise<Scan[]> => {
      const params = new URLSearchParams()
      if (gameType) params.set('gameType', gameType)
      if (status) params.set('status', status)
      if (limit) params.set('limit', limit.toString())

      const query = params.toString()
      const endpoint = `/scans${query ? `?${query}` : ''}`

      const response = await callApi<{ data: Scan[]; meta: { total: number } }>(endpoint)
      return response.data?.data ?? []
    },
  })
}
