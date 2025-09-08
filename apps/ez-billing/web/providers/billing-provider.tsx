'use client'
import { BillingContext } from '@/contexts/billing-context'
import { useAuth } from '@ezstart/auth-sdk'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ez-billing/types'
import { useCallback, useEffect, useState } from 'react'
import { callApi } from '@ezstart/ui/utils'
import { getUserId } from '../utils/get-user-id'

export const BillingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth()

  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const refetchAll = useCallback(async () => {
    if (!user || !isAuthenticated) return
    setLoading(true)
    try {
      const userId = getUserId()
      const [clientsRes, invoicesRes, quotesRes, receiptsRes, companiesRes, paymentMethodsRes] =
        await Promise.all([
          callApi<Client[]>('/clients', { userId }),
          callApi<Invoice[]>('/invoices', { userId }),
          callApi<Quote[]>('/quotes', { userId }),
          callApi<Receipt[]>('/receipts', { userId }),
          callApi<Company[]>('/companies', { userId }),
          callApi<PaymentMethod[]>('/payment-methods', { userId }),
        ])

      if (clientsRes.ok && clientsRes.data) setClients(clientsRes.data)
      if (invoicesRes.ok && invoicesRes.data) setInvoices(invoicesRes.data)
      if (quotesRes.ok && quotesRes.data) setQuotes(quotesRes.data)
      if (receiptsRes.ok && receiptsRes.data) setReceipts(receiptsRes.data)
      if (companiesRes.ok && companiesRes.data) setCompanies(companiesRes.data)
      if (paymentMethodsRes.ok && paymentMethodsRes.data) setPaymentMethods(paymentMethodsRes.data)
    } finally {
      setLoading(false)
    }
  }, [user, isAuthenticated])

  useEffect(() => {
    refetchAll()
  }, [user?._id, isAuthenticated, refetchAll]) // Trigger when user changes or auth state changes

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
