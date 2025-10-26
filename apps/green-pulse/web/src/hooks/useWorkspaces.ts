'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi } from '@/utils/api'

const WORKSPACES_KEY = ['workspaces']

export function useWorkspaces() {
  return useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: async () => {
      return callApi('/workspaces', {
        headers: {
          'x-user-id': 'demo-user-1', // TODO: Replace with real user ID from auth
        },
      })
    },
  })
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ['workspace', id],
    queryFn: async () => {
      return callApi(`/workspaces/${id}`, {
        headers: {
          'x-user-id': 'demo-user-1',
        },
      })
    },
    enabled: !!id,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; slug: string; description?: string }) => {
      return callApi('/workspaces', {
        method: 'POST',
        body: data,
        headers: {
          'x-user-id': 'demo-user-1',
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY })
    },
  })
}

export function useUpdateWorkspace(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<{ name: string; description: string; status: string }>) => {
      return callApi(`/workspaces/${id}`, {
        method: 'PUT',
        body: data,
        headers: {
          'x-user-id': 'demo-user-1',
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY })
      queryClient.invalidateQueries({ queryKey: ['workspace', id] })
    },
  })
}

export function useDeleteWorkspace(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return callApi(`/workspaces/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'demo-user-1',
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY })
    },
  })
}
