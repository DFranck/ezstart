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
      const query: Record<string, string> = {
        limit: String(params.limit),
        offset: String(params.offset),
      }
      if (params.userId) {
        query.userId = params.userId
      }

      const response = await callApi<QRCodesResponse>('/qr-codes', { query })
      if (!response.ok) {
        throw new Error('Failed to fetch QR codes')
      }

      return {
        ...response.data,
        meta: response.meta as QRCodesMeta,
      }
    },
    enabled: params.enabled,
  })
}

export function useCreateQRCode(t: (key: string) => string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateQRCodePayload) => {
      const response = await callApi<SavedQRCode>('/qr-codes', {
        method: 'POST',
        body: payload,
      })
      if (!response.ok) {
        throw new Error('Failed to save QR code')
      }
      return response.data
    },
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
    mutationFn: async (id: string) => {
      const response = await callApi(`/qr-codes/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete QR code')
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] })
      toast.success(t('saved.deleteSuccess'))
    },
    onError: () => {
      toast.error(t('saved.deleteError'))
    },
  })
}
