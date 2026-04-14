import { useQuery } from '@tanstack/react-query'
import type { Scan } from '@gacha-analyzer/types'
import { callApi } from '@/config/api'

export function useScanDetail(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: () => callApi<Scan>(`/scans/${id}`),
    enabled: !!id,
  })
}
