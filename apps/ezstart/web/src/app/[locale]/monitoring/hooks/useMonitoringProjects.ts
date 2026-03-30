import { useQuery } from '@tanstack/react-query'
import { callApi } from '@/config/api'

export interface MonitoringProject {
  name?: string
  status?: string
  lastCheck?: string
  avgResponseTime?: number | null
  url?: string
}

export interface ProjectsData {
  projects: MonitoringProject[]
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

async function fetchProjects(): Promise<ProjectsData> {
  const response = await callApi<ProjectsData>('/projects', {
    query: { _t: String(Date.now()) },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch projects data')
  }

  return response.data
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
