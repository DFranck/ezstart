'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi, runWithFeedback } from '@/config/api'
import { useAuthStore } from '@ezstart/auth-sdk'

const WORKSPACES_KEY = ['workspaces']

type WorkspaceItem = {
  _id: string
  slug: string
  name: string
  description?: string
  logoUrl?: string
  currentUserRole?: string
  projectCount?: number
  memberCount?: number
  status?: string
  [key: string]: unknown
}

export function useWorkspaces() {
  const { user } = useAuthStore()

  return useQuery<WorkspaceItem[]>({
    queryKey: [...WORKSPACES_KEY, user?._id],
    queryFn: async () => {
      if (!user?._id) throw new Error('User not authenticated')

      return callApi<WorkspaceItem[]>('/workspaces', {
        headers: {
          'x-user-id': user._id,
        },
      })
    },
    enabled: !!user?._id,
  })
}

export function useWorkspace(id: string) {
  const { user } = useAuthStore()

  return useQuery<WorkspaceItem>({
    queryKey: ['workspace', id],
    queryFn: async () => {
      if (!user?._id) throw new Error('User not authenticated')

      return callApi<WorkspaceItem>(`/workspaces/${id}`, {
        headers: {
          'x-user-id': user._id,
        },
      })
    },
    enabled: !!id && !!user?._id,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: { name: string; slug: string; description?: string }) => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi<WorkspaceItem>('/workspaces', {
            method: 'POST',
            body: data,
            headers: {
              'x-user-id': user._id,
            },
          }),
        toastLoading: { message: 'Creating workspace...' },
        toastSuccess: { message: `Workspace "${data.name}" created successfully!` },
        toastError: { message: 'Failed to create workspace' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WORKSPACES_KEY, user?._id] })
    },
  })
}

export function useUpdateWorkspace(id: string) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: Partial<{ name: string; description: string; status: string }>) => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi<WorkspaceItem>(`/workspaces/${id}`, {
            method: 'PUT',
            body: data,
            headers: {
              'x-user-id': user._id,
            },
          }),
        toastLoading: { message: 'Updating workspace...' },
        toastSuccess: { message: 'Workspace updated successfully!' },
        toastError: { message: 'Failed to update workspace' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WORKSPACES_KEY, user?._id] })
      queryClient.invalidateQueries({ queryKey: ['workspace', id] })
    },
  })
}

export function useDeleteWorkspace(id: string) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi<{ deleted: true }>(`/workspaces/${id}`, {
            method: 'DELETE',
            headers: {
              'x-user-id': user._id,
            },
          }),
        toastLoading: { message: 'Deleting workspace...' },
        toastSuccess: { message: 'Workspace deleted successfully!' },
        toastError: { message: 'Failed to delete workspace' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...WORKSPACES_KEY, user?._id] })
    },
  })
}
