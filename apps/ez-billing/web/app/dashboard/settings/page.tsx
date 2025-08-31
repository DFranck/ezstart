'use client'

import { Button, H2, H3, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
import { callBillingApi } from '../../../utils/call-billing-api'
import { Client, Company, Invoice, Quote, Receipt } from '@ez-billing/types'
import { useEffect, useState } from 'react'
import { DeletedItemsManager } from './components/deleted-items-manager'

export default function SettingsPage() {
  const [deletedItems, setDeletedItems] = useState({
    clients: [] as Client[],
    companies: [] as Company[],
    quotes: [] as Quote[],
    invoices: [] as Invoice[],
    receipts: [] as Receipt[],
  })
  const [loading, setLoading] = useState(true)

  const loadDeletedItems = async () => {
    try {
      setLoading(true)
      const [clients, companies, quotes, invoices, receipts] = await Promise.all([
        callBillingApi('/clients?deletedOnly=true'),
        callBillingApi('/companies?deletedOnly=true'),
        callBillingApi('/quotes?deletedOnly=true'),
        callBillingApi('/invoices?deletedOnly=true'),
        callBillingApi('/receipts?deletedOnly=true'),
      ])

      setDeletedItems({
        clients: clients.ok && Array.isArray(clients.data) ? clients.data : [],
        companies: companies.ok && Array.isArray(companies.data) ? companies.data : [],
        quotes: quotes.ok && Array.isArray(quotes.data) ? quotes.data : [],
        invoices: invoices.ok && Array.isArray(invoices.data) ? invoices.data : [],
        receipts: receipts.ok && Array.isArray(receipts.data) ? receipts.data : [],
      })
    } catch (error) {
      console.error('Error loading deleted items:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeletedItems()
  }, [])

  const handleRestore = async (type: string, id: string) => {
    try {
      await callBillingApi(`/${type}/${id}/restore`, { method: 'POST' })
      await loadDeletedItems() // Refresh the list
    } catch (error) {
      console.error(`Error restoring ${type}:`, error)
    }
  }

  const handleHardDelete = async (type: string, id: string) => {
    try {
      await callBillingApi(`/${type}/${id}?permanent=true`, { method: 'DELETE' })
      await loadDeletedItems() // Refresh the list
    } catch (error) {
      console.error(`Error permanently deleting ${type}:`, error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <H2>Settings</H2>
        <div className="mt-6">Loading deleted items...</div>
      </div>
    )
  }

  const totalDeleted = Object.values(deletedItems).reduce((sum, items) => sum + items.length, 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <H2>Settings</H2>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and recover deleted items.
        </p>
      </div>

      <Tabs defaultValue="deleted-items">
        <TabsList>
          <TabsTrigger value="deleted-items">
            Deleted Items {totalDeleted > 0 && <span className="ml-1 text-xs">({totalDeleted})</span>}
          </TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="deleted-items" className="mt-6">
          <div className="space-y-6">
            <div>
              <H3>Recover Deleted Items</H3>
              <p className="text-sm text-muted-foreground">
                Items shown here have been deleted but can be restored or permanently removed.
              </p>
            </div>

            <div className="grid gap-6">
              <DeletedItemsManager
                title="Clients"
                items={deletedItems.clients}
                type="clients"
                getDisplayName={(item: Client) => item.clientName}
                getDescription={(item: Client) => item.email || 'No email'}
                onRestore={(id) => handleRestore('clients', id)}
                onHardDelete={(id) => handleHardDelete('clients', id)}
              />

              <DeletedItemsManager
                title="Companies"
                items={deletedItems.companies}
                type="companies"
                getDisplayName={(item: Company) => item.companyName}
                getDescription={(item: Company) => item.email || 'No email'}
                onRestore={(id) => handleRestore('companies', id)}
                onHardDelete={(id) => handleHardDelete('companies', id)}
              />

              <DeletedItemsManager
                title="Quotes"
                items={deletedItems.quotes}
                type="quotes"
                getDisplayName={(item: Quote) => item.documentNumber}
                getDescription={(item: Quote) => `${item.total.toFixed(2)} ${item.currency}`}
                onRestore={(id) => handleRestore('quotes', id)}
                onHardDelete={(id) => handleHardDelete('quotes', id)}
              />

              <DeletedItemsManager
                title="Invoices"
                items={deletedItems.invoices}
                type="invoices"
                getDisplayName={(item: Invoice) => item.documentNumber}
                getDescription={(item: Invoice) => `${item.total.toFixed(2)} ${item.currency}`}
                onRestore={(id) => handleRestore('invoices', id)}
                onHardDelete={(id) => handleHardDelete('invoices', id)}
              />

              <DeletedItemsManager
                title="Receipts"
                items={deletedItems.receipts}
                type="receipts"
                getDisplayName={(item: Receipt) => item.documentNumber}
                getDescription={(item: Receipt) => `${item.total.toFixed(2)} ${item.currency}`}
                onRestore={(id) => handleRestore('receipts', id)}
                onHardDelete={(id) => handleHardDelete('receipts', id)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <div>
            <H3>Account Settings</H3>
            <p className="text-muted-foreground">Account management features coming soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}