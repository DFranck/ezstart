import { useQuery } from '@tanstack/react-query'
import { callApi } from '@/config/api'

export interface AuditsData {
  audits: any[]
}

async function fetchAudits(): Promise<AuditsData> {
  const response = await callApi<AuditsData>('/audits', {
    query: { _t: String(Date.now()) },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch audits data')
  }

  return response.data
}

export function useMonitoringAudits() {
  return useQuery({
    queryKey: ['monitoring', 'audits'],
    queryFn: fetchAudits,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    retry: 2,
    retryDelay: 1000,
  })
}
