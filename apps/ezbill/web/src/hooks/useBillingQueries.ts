'use client'

import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { callApi } from '@/config/api'

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

function userHeader(userId?: string): Record<string, string> | undefined {
  return userId ? { 'X-User-Id': userId } : undefined
}

// Individual query hooks
export function useClients(userId?: string) {
  return useQuery({
    queryKey: billingKeys.clients(),
    queryFn: () => callApi<Client[]>('/clients', { headers: userHeader(userId) }),
    enabled: !!userId, // Only run query when userId is available
  })
}

export function useInvoices(userId?: string) {
  return useQuery({
    queryKey: billingKeys.invoices(),
    queryFn: async () => {
      const data = await callApi<Invoice[]>('/invoices', { headers: userHeader(userId) })
      // Filter out soft-deleted items
      return data.filter(item => !item.deletedAt)
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

export function useQuotes(userId?: string) {
  return useQuery({
    queryKey: billingKeys.quotes(),
    queryFn: async () => {
      const data = await callApi<Quote[]>('/quotes', { headers: userHeader(userId) })
      // Filter out soft-deleted items
      return data.filter(item => !item.deletedAt)
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

export function useReceipts(userId?: string) {
  return useQuery({
    queryKey: billingKeys.receipts(),
    queryFn: async () => {
      const data = await callApi<Receipt[]>('/receipts', { headers: userHeader(userId) })
      // Filter out soft-deleted items
      return data.filter(item => !item.deletedAt)
    },
    enabled: !!userId, // Only run query when userId is available
  })
}

export function useCompanies(userId?: string) {
  return useQuery({
    queryKey: billingKeys.companies(),
    queryFn: () => callApi<Company[]>('/companies', { headers: userHeader(userId) }),
    enabled: !!userId, // Only run query when userId is available
  })
}

export function usePaymentMethods(userId?: string) {
  return useQuery({
    queryKey: billingKeys.paymentMethods(),
    queryFn: () => callApi<PaymentMethod[]>('/payment-methods', { headers: userHeader(userId) }),
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
