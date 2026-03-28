'use client'

import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { callApi, parseApiError } from '@/utils/api'

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Query keys
export const billingKeys = {
  all: ['billing'] as const,
  clients: () => [...billingKeys.all, 'clients'] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
  quotes: () => [...billingKeys.all, 'quotes'] as const,
  receipts: () => [...billingKeys.all, 'receipts'] as const,
  companies: () => [...billingKeys.all, 'companies'] as const,
  paymentMethods: () => [...billingKeys.all, 'payment-methods'] as const,
}

// Individual query hooks
export function useClients(userId?: string) {
  return useQuery({
    queryKey: billingKeys.clients(),
    queryFn: async () => {
      const response = await callApi<PaginatedResponse<Client>>('/clients', { userId: userId! })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      return response.data.data
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

export function useInvoices(userId?: string) {
  return useQuery({
    queryKey: billingKeys.invoices(),
    queryFn: async () => {
      const response = await callApi<Invoice[]>('/invoices', { userId: userId! })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

export function useQuotes(userId?: string) {
  return useQuery({
    queryKey: billingKeys.quotes(),
    queryFn: async () => {
      const response = await callApi<Quote[]>('/quotes', { userId: userId! })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

export function useReceipts(userId?: string) {
  return useQuery({
    queryKey: billingKeys.receipts(),
    queryFn: async () => {
      const response = await callApi<Receipt[]>('/receipts', { userId: userId! })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

export function useCompanies(userId?: string) {
  return useQuery({
    queryKey: billingKeys.companies(),
    queryFn: async () => {
      const response = await callApi<PaginatedResponse<Company>>('/companies', { userId: userId! })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      return response.data.data
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

export function usePaymentMethods(userId?: string) {
  return useQuery({
    queryKey: billingKeys.paymentMethods(),
    queryFn: async () => {
      const response = await callApi<PaginatedResponse<PaymentMethod>>('/payment-methods', { userId: userId! })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      return response.data.data
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

// Invalidation helper
export function useInvalidateBilling() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
    invalidateClients: () => queryClient.invalidateQueries({ queryKey: billingKeys.clients() }),
    invalidateInvoices: () => queryClient.invalidateQueries({ queryKey: billingKeys.invoices() }),
    invalidateQuotes: () => queryClient.invalidateQueries({ queryKey: billingKeys.quotes() }),
    invalidateReceipts: () => queryClient.invalidateQueries({ queryKey: billingKeys.receipts() }),
    invalidateCompanies: () => queryClient.invalidateQueries({ queryKey: billingKeys.companies() }),
    invalidatePaymentMethods: () =>
      queryClient.invalidateQueries({ queryKey: billingKeys.paymentMethods() }),
  }
}
