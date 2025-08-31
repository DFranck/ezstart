'use client'

import { Button, Icon, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  const totalDeleted = Object.values(deletedItems).reduce((sum, items) => sum + items.length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header with glass effect */}
      <div className="backdrop-blur-sm bg-white/70 border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage your account settings and recover deleted items</p>
            </div>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Icon name="lucide:Trash2" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalDeleted}</p>
                    <p className="text-sm text-gray-500">Deleted Items</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="deleted-items" className="space-y-8">
          <TabsList className="bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg">
            <TabsTrigger 
              value="deleted-items" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <Icon name="lucide:Trash2" className="w-4 h-4 mr-2" />
              Deleted Items {totalDeleted > 0 && <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-700 rounded-full text-xs font-medium">({totalDeleted})</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="account"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <Icon name="lucide:User" className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deleted-items" className="space-y-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Icon name="lucide:RefreshCw" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Recover Deleted Items</h2>
                    <p className="text-sm text-gray-500">Items shown here have been deleted but can be restored or permanently removed</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
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

          <TabsContent value="account" className="space-y-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Icon name="lucide:User" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Account Settings</h2>
                    <p className="text-sm text-gray-500">Manage your account preferences and security</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Icon name="lucide:Settings" className="w-10 h-10 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-500 mb-6">
                    Account management features are being developed and will be available soon
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}