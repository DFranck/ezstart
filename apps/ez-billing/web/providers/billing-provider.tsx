'use client'
import { BillingContext } from '@/contexts/billing-context'
import { useUserStore } from '@/stores/useUserStore'
import { Client, Company, Invoice, Quote, Receipt } from '@ez-billing/types'
import { callBillingApi } from '../utils/call-billing-api'
import { useCallback, useEffect, useState } from 'react'

export const BillingProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserStore()

  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const refetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [clientsRes, invoicesRes, quotesRes, receiptsRes, companiesRes] = await Promise.all([
        callBillingApi<Client[]>('/clients', {}),
        callBillingApi<Invoice[]>('/invoices', {}),
        callBillingApi<Quote[]>('/quotes', {}),
        callBillingApi<Receipt[]>('/receipts', {}),
        callBillingApi<Company[]>('/companies', {}),
      ])

      if (clientsRes.ok && clientsRes.data) setClients(clientsRes.data)
      if (invoicesRes.ok && invoicesRes.data) setInvoices(invoicesRes.data)
      if (quotesRes.ok && quotesRes.data) setQuotes(quotesRes.data)
      if (receiptsRes.ok && receiptsRes.data) setReceipts(receiptsRes.data)
      if (companiesRes.ok && companiesRes.data) setCompanies(companiesRes.data)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refetchAll()
  }, [user?.username]) // Only depend on username to avoid infinite loops

  return (
    <BillingContext.Provider
      value={{
        clients,
        invoices,
        quotes,
        receipts,
        companies,
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
