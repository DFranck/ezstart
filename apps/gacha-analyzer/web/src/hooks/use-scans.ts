import { useQuery } from '@tanstack/react-query'
import type { GameType, Scan, ScanStatus } from '@gacha-analyzer/types'
import { callApi } from '@/config/api'

interface UseScansOptions {
  gameType?: GameType
  status?: ScanStatus
  page?: number
  pageSize?: number
}

interface UseScansResult {
  scans: Scan[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  isLoading: boolean
}

export function useScans(options: UseScansOptions = {}): UseScansResult {
  const { gameType, status, page = 1, pageSize = 20 } = options
  const offset = (page - 1) * pageSize

  const query = useQuery({
    queryKey: ['scans', { gameType, status, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (gameType) params.set('gameType', gameType)
      if (status) params.set('status', status)
      params.set('limit', pageSize.toString())
      params.set('offset', offset.toString())

      const response = await callApi<Scan[]>(`/scans?${params}`)
      return { scans: response.ok ? response.data : [], meta: response.meta }
    },
  })

  const result = query.data
  return {
    scans: result?.scans ?? [],
    total: result?.meta?.total ?? 0,
    page,
    pageSize,
    hasMore: (result?.meta?.total ?? 0) > page * pageSize,

    isLoading: query.isLoading,
  }
}
