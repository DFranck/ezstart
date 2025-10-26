'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi } from '@/utils/api'

export function useFormConfigs() {
  return useQuery({
    queryKey: ['form-configs'],
    queryFn: async () => {
      return callApi('/forms/configs')
    },
  })
}

export function useFormConfig(id: string) {
  return useQuery({
    queryKey: ['form-config', id],
    queryFn: async () => {
      return callApi(`/forms/configs/${id}`)
    },
    enabled: !!id,
  })
}

export function useFormInstances(userId?: string) {
  return useQuery({
    queryKey: ['form-instances', userId],
    queryFn: async () => {
      return callApi(`/forms/instances?userId=${userId || 'demo-user-1'}`)
    },
  })
}

export function useFormInstance(id: string) {
  return useQuery({
    queryKey: ['form-instance', id],
    queryFn: async () => {
      return callApi(`/forms/instances/${id}`)
    },
    enabled: !!id,
  })
}

export function useCreateFormInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      formConfigId: string
      projectId?: string
      mode?: 'manual' | 'chat' | 'vocal'
    }) => {
      return callApi('/forms/instances?userId=demo-user-1', {
        method: 'POST',
        body: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-instances'] })
    },
  })
}

export function useUpdateFormInstance(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      fields?: Record<string, any>
      status?: 'draft' | 'in_progress' | 'completed' | 'submitted'
    }) => {
      return callApi(`/forms/instances/${id}`, {
        method: 'PUT',
        body: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-instances'] })
      queryClient.invalidateQueries({ queryKey: ['form-instance', id] })
    },
  })
}

export function useSubmitFormInstance(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return callApi(`/forms/instances/${id}/submit`, {
        method: 'POST',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-instances'] })
      queryClient.invalidateQueries({ queryKey: ['form-instance', id] })
    },
  })
}

export function useExtractFormData() {
  return useMutation({
    mutationFn: async (data: {
      formConfigId: string
      conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    }) => {
      return callApi('/forms/extract', {
        method: 'POST',
        body: data,
      })
    },
  })
}
