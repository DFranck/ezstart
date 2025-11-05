'use client'

import { getUserId } from '@/utils/get-user-id'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { callApi, parseApiError } from '@/utils/api'

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
export function useClients() {
  return useQuery({
    queryKey: billingKeys.clients(),
    queryFn: async () => {
      const userId = getUserId()
      const response = await callApi<Client[]>('/clients', { userId })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
  })
}

export function useInvoices() {
  return useQuery({
    queryKey: billingKeys.invoices(),
    queryFn: async () => {
      const userId = getUserId()
      const response = await callApi<Invoice[]>('/invoices', { userId })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
  })
}

export function useQuotes() {
  return useQuery({
    queryKey: billingKeys.quotes(),
    queryFn: async () => {
      const userId = getUserId()
      const response = await callApi<Quote[]>('/quotes', { userId })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
  })
}

export function useReceipts() {
  return useQuery({
    queryKey: billingKeys.receipts(),
    queryFn: async () => {
      const userId = getUserId()
      const response = await callApi<Receipt[]>('/receipts', { userId })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
  })
}

export function useCompanies() {
  return useQuery({
    queryKey: billingKeys.companies(),
    queryFn: async () => {
      const userId = getUserId()
      const response = await callApi<Company[]>('/companies', { userId })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: billingKeys.paymentMethods(),
    queryFn: async () => {
      const userId = getUserId()
      const response = await callApi<PaymentMethod[]>('/payment-methods', { userId })
      if (!response.ok) throw new Error(parseApiError(response.data))
      if (!response.data) throw new Error('No data returned from API')
      // Filter out soft-deleted items
      return response.data.filter((item) => !item.deletedAt)
    },
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
