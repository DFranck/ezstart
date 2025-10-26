'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi } from '@/utils/api'

export function useProjects(userId?: string) {
  return useQuery({
    queryKey: ['projects', userId],
    queryFn: async () => {
      return callApi(`/projects?userId=${userId || 'demo-user-1'}`)
    },
    enabled: !!userId,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      return callApi(`/projects/${id}`)
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string
      name: string
      description?: string
      companyName?: string
      companyAddress?: string
      companySector?: string
    }) => {
      return callApi('/projects?userId=demo-user-1', {
        method: 'POST',
        body: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<{
      name: string
      description: string
      status: string
      companyName: string
      companyAddress: string
      companySector: string
    }>) => {
      return callApi(`/projects/${id}`, {
        method: 'PUT',
        body: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
    },
  })
}

export function useDeleteProject(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return callApi(`/projects/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProjectForms(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'forms'],
    queryFn: async () => {
      return callApi(`/projects/${projectId}/forms`)
    },
    enabled: !!projectId,
  })
}
