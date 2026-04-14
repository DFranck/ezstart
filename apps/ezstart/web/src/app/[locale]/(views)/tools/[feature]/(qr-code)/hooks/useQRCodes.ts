'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callApi } from '@/config/api'
import { toast } from 'sonner'

export interface SavedQRCode {
  id: string
  userId: string
  userEmail?: string
  url: string
  title?: string
  redirectType: 'permanent' | 'temporary'
  size: number
  foreground: string
  background: string
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
  includeMargin: boolean
  scansCount: number
  createdAt: string
  updatedAt: string
}

interface QRCodesResponse {
  qrCodes: SavedQRCode[]
}

interface QRCodesMeta {
  total: number
  limit: number
  offset: number
}

interface CreateQRCodePayload {
  url: string
  title?: string
  redirectType: 'permanent' | 'temporary'
  size: number
  foreground: string
  background: string
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
  includeMargin: boolean
  userEmail?: string
}

export function useQRCodes(params: {
  limit: number
  offset: number
  userId?: string
  enabled: boolean
}) {
  return useQuery<QRCodesResponse & { meta: QRCodesMeta }>({
    queryKey: ['qr-codes', params.limit, params.offset, params.userId],
    queryFn: async () => {
      const query: Record<string, string | number> = {
        limit: params.limit,
        offset: params.offset,
      }
      if (params.userId) {
        query.userId = params.userId
      }

      // Preserve envelope to access pagination meta alongside data
      const envelope = await callApi<{ data: QRCodesResponse; meta: QRCodesMeta }>('/qr-codes', {
        query,
        preserveEnvelope: true,
      })

      return {
        ...envelope.data,
        meta: envelope.meta,
      }
    },
    enabled: params.enabled,
  })
}

export function useCreateQRCode(t: (key: string) => string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateQRCodePayload) =>
      callApi<SavedQRCode>('/qr-codes', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] })
      toast.success(t('saved.saveSuccess'))
    },
    onError: () => {
      toast.error(t('saved.saveError'))
    },
  })
}

export function useDeleteQRCode(t: (key: string) => string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      callApi(`/qr-codes/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] })
      toast.success(t('saved.deleteSuccess'))
    },
    onError: () => {
      toast.error(t('saved.deleteError'))
    },
  })
}
