import { useQuery } from '@tanstack/react-query'
import type { Scan } from '@game-analyzer/types'
import { callApi } from '@/config/api'

export function useScanDetail(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: async (): Promise<Scan | null> => {
      const response = await callApi<{ data: Scan }>(`/scans/${id}`)
      return response.data?.data ?? null
    },
    enabled: !!id,
  })
}
