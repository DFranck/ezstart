'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi, runWithFeedback } from '@/config/api'
import { useAuthStore } from '@ezstart/auth-sdk'

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
      return callApi<{
        name: string
        description?: string
        status?: string
        companyName?: string
        companySector?: string
        companyAddress?: string
      }>(`/projects/${id}`)
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string
      name: string
      description?: string
      companyName?: string
      companyAddress?: string
      companySector?: string
    }) => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi(`/projects?userId=${user._id}`, {
            method: 'POST',
            body: data,
          }),
        toastLoading: { message: 'Creating project...' },
        toastSuccess: { message: `Project "${data.name}" created successfully!` },
        toastError: { message: 'Failed to create project' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (
      data: Partial<{
        name: string
        description: string
        status: string
        companyName: string
        companyAddress: string
        companySector: string
      }>
    ) => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi(`/projects/${id}`, {
            method: 'PUT',
            body: data,
          }),
        toastLoading: { message: 'Updating project...' },
        toastSuccess: { message: 'Project updated successfully!' },
        toastError: { message: 'Failed to update project' },
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
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi(`/projects/${id}`, {
            method: 'DELETE',
          }),
        toastLoading: { message: 'Deleting project...' },
        toastSuccess: { message: 'Project deleted successfully!' },
        toastError: { message: 'Failed to delete project' },
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
