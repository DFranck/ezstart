import { useQuery } from '@tanstack/react-query'
import type { Scan } from '@gacha-analyzer/types'
import { callApi } from '@/config/api'

export function useScanDetail(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: async (): Promise<Scan | null> => {
      const response = await callApi<Scan>(`/scans/${id}`)
      return response.ok ? response.data : null
    },
    enabled: !!id,
  })
}
