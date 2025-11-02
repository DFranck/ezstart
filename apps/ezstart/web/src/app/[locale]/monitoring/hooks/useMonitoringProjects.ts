import { useQuery } from '@tanstack/react-query'
import { MONITORING_API_URL } from '../lib/config'

export interface ProjectsData {
  projects: any[]
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

async function fetchProjects(): Promise<ProjectsData> {
  const timestamp = Date.now()
  const response = await fetch(`${MONITORING_API_URL}/api/projects?_t=${timestamp}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(30000), // 30s timeout
  })

  if (!response.ok) {
    throw new Error('Failed to fetch projects data')
  }

  return response.json()
}

export function useMonitoringProjects() {
  return useQuery({
    queryKey: ['monitoring', 'projects'],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
    retry: 2,
    retryDelay: 1000,
  })
}
