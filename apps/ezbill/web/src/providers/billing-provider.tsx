'use client'
import { BillingContext } from '@/contexts/billing-context'
import {
  useClients,
  useCompanies,
  useInvalidateBilling,
  useInvoices,
  usePaymentMethods,
  useQuotes,
  useReceipts,
} from '@/hooks/useBillingQueries'
import { Client } from '@ezbill/types'
import { useAuth } from '@ezstart/auth-sdk'
import { useState } from 'react'

export const BillingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth()
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Use React Query hooks
  const { data: clients = [], isLoading: clientsLoading } = useClients()
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices()
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes()
  const { data: receipts = [], isLoading: receiptsLoading } = useReceipts()
  const { data: companies = [], isLoading: companiesLoading } = useCompanies()
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = usePaymentMethods()

  const { invalidateAll } = useInvalidateBilling()

  // Aggregate loading state
  const loading =
    clientsLoading ||
    invoicesLoading ||
    quotesLoading ||
    receiptsLoading ||
    companiesLoading ||
    paymentMethodsLoading

  // Refetch function for backward compatibility
  const refetchAll = async () => {
    invalidateAll()
  }

  // Don't render if not authenticated
  if (!user || !isAuthenticated) {
    return null
  }

  return (
    <BillingContext.Provider
      value={{
        clients,
        invoices,
        quotes,
        receipts,
        companies,
        paymentMethods,
        loading,
        refetchAll,
        selectedClient,
        setSelectedClient,
      }}
    >
      {children}
    </BillingContext.Provider>
  )
}
