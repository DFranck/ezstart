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

  const userId = user?._id

  // Use React Query hooks - pass userId to each hook
  const { data: clients = [], isLoading: clientsLoading } = useClients(userId)
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices(userId)
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes(userId)
  const { data: receipts = [], isLoading: receiptsLoading } = useReceipts(userId)
  const { data: companies = [], isLoading: companiesLoading } = useCompanies(userId)
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = usePaymentMethods(userId)

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

  // Provider should always render - auth check is done at page level
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
