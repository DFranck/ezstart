import { useQuery } from '@tanstack/react-query'
import { callApi } from '@/config/api'

export interface ErrorLog {
  id: string
  type: 'error'
  severity: 'critical' | 'error' | 'warning'
  title: string
  message: string
  source: string
  project?: string
  timestamp: string
  metadata?: {
    count?: number
    userCount?: number
    stackTrace?: string
  }
  url?: string
}

export interface ErrorsData {
  logs: ErrorLog[]
}

async function fetchErrors(): Promise<ErrorsData> {
  const response = await callApi<{ logs: Array<ErrorLog & { type: string }> }>('/activity', {
    query: { _t: String(Date.now()) },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch error logs')
  }

  // Filter only errors
  const errorLogs = (response.data.logs || []).filter(log => log.type === 'error')

  return { logs: errorLogs }
}

export function useMonitoringErrors() {
  return useQuery({
    queryKey: ['monitoring', 'errors'],
    queryFn: fetchErrors,
    staleTime: 2 * 60 * 1000, // 2 minutes cache (shorter for errors)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
    retry: 2,
    retryDelay: 1000,
  })
}
