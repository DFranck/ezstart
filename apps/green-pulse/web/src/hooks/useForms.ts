'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi, runWithFeedback } from '@/config/api'
import { useAuthStore } from '@ezstart/auth-sdk'

export type FormConfigItem = {
  _id: string
  name: string
  description?: string
  category?: string
  icon?: string
  extraction?: { fields?: unknown[] }
  [key: string]: unknown
}

export type FormInstanceItem = {
  _id: string
  formConfigId?: string
  mode?: string
  status?: string
  fields?: Record<string, unknown>
  [key: string]: unknown
}

export function useFormConfigs() {
  return useQuery<FormConfigItem[]>({
    queryKey: ['form-configs'],
    queryFn: async () => {
      return callApi<FormConfigItem[]>('/forms/configs')
    },
  })
}

export function useFormConfig(id: string) {
  return useQuery<Record<string, unknown>>({
    queryKey: ['form-config', id],
    queryFn: async () => {
      return callApi<Record<string, unknown>>(`/forms/configs/${id}`)
    },
    enabled: !!id,
  })
}

export function useFormInstances(userId?: string) {
  return useQuery<FormInstanceItem[]>({
    queryKey: ['form-instances', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return callApi<FormInstanceItem[]>(`/forms/instances?userId=${userId}`)
    },
    enabled: !!userId,
  })
}

export function useFormInstance(id: string) {
  return useQuery<Record<string, unknown>>({
    queryKey: ['form-instance', id],
    queryFn: async () => {
      return callApi<Record<string, unknown>>(`/forms/instances/${id}`)
    },
    enabled: !!id,
  })
}

export function useCreateFormInstance() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: {
      formConfigId: string
      projectId?: string
      mode?: 'manual' | 'chat' | 'vocal'
    }) => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi<{ _id: string }>(`/forms/instances?userId=${user._id}`, {
            method: 'POST',
            body: data,
          }),
        toastLoading: { message: 'Creating form instance...' },
        toastSuccess: { message: 'Form instance created successfully!' },
        toastError: { message: 'Failed to create form instance' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-instances'] })
    },
  })
}

export function useUpdateFormInstance(id: string) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: {
      fields?: Record<string, any>
      status?: 'draft' | 'in_progress' | 'completed' | 'submitted'
    }) => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi<FormInstanceItem>(`/forms/instances/${id}`, {
            method: 'PUT',
            body: data,
          }),
        toastLoading: { message: 'Updating form...' },
        toastSuccess: { message: 'Form updated successfully!' },
        toastError: { message: 'Failed to update form' },
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
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      if (!user?._id) throw new Error('User not authenticated')

      return runWithFeedback({
        action: async () =>
          callApi<FormInstanceItem>(`/forms/instances/${id}/submit`, {
            method: 'POST',
          }),
        toastLoading: { message: 'Submitting form...' },
        toastSuccess: { message: 'Form submitted successfully!' },
        toastError: { message: 'Failed to submit form' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-instances'] })
      queryClient.invalidateQueries({ queryKey: ['form-instance', id] })
    },
  })
}

export type ExtractFormDataResult = {
  extractedFields: Record<string, unknown>
  aiResponse?: string
  missingFields?: string[]
}

export function useExtractFormData() {
  return useMutation<
    ExtractFormDataResult,
    Error,
    {
      formConfigId: string
      conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
    }
  >({
    mutationFn: async data => {
      return callApi<ExtractFormDataResult>('/forms/extract', {
        method: 'POST',
        body: data,
      })
    },
  })
}
