'use client'

import { CompanyModal } from '@/components/company-modal'
import CompanyCard from '@/components/CompanyCard_v2'
import { PaymentMethodModal } from '@/components/payment-method-modal'
import PaymentMethodCard from '@/components/PaymentMethodCard_v2'
import { useBillingContext } from '@/contexts/billing-context'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  H2,
  H3,
  Icon,
  P,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { callApi } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getUserId } from '../../../utils/get-user-id'
import { DeletedItemsManager } from './components/deleted-items-manager'

export default function SettingsPage() {
  const { companies, paymentMethods, refetchAll } = useBillingContext()
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined)
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false)
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | undefined>(
    undefined
  )
  const [deletedItems, setDeletedItems] = useState({
    clients: [] as Client[],
    companies: [] as Company[],
    quotes: [] as Quote[],
    invoices: [] as Invoice[],
    receipts: [] as Receipt[],
  })
  const [loading, setLoading] = useState(true)
  const { isMobile } = useDevice()
  const loadDeletedItems = async () => {
    try {
      setLoading(true)
      const userId = getUserId()
      const [clients, companies, quotes, invoices, receipts] = await Promise.all([
        callApi('/clients?deletedOnly=true', { userId }),
        callApi('/companies?deletedOnly=true', { userId }),
        callApi('/quotes?deletedOnly=true', { userId }),
        callApi('/invoices?deletedOnly=true', { userId }),
        callApi('/receipts?deletedOnly=true', { userId }),
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
      await callApi(`/${type}/${id}/restore`, {
        method: 'POST',
        userId: getUserId(),
      })
      await loadDeletedItems() // Refresh the list
    } catch (error) {
      console.error(`Error restoring ${type}:`, error)
    }
  }

  const handleHardDelete = async (type: string, id: string) => {
    try {
      await callApi(`/${type}/${id}/hard-delete`, {
        method: 'DELETE',
        userId: getUserId(),
      })
      await loadDeletedItems() // Refresh the list
    } catch (error) {
      console.error(`Error permanently deleting ${type}:`, error)
    }
  }

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company)
    setIsCompanyModalOpen(true)
  }

  const handleCompanyModalClose = () => {
    setIsCompanyModalOpen(false)
    setEditingCompany(undefined)
  }

  const handleDeleteCompany = async (company: Company) => {
    try {
      await callApi(`/companies/${company._id}`, {
        method: 'DELETE',
        userId: getUserId(),
      })
      toast.success(`${company.companyName} deleted successfully`)
      refetchAll()
    } catch (error) {
      console.error('Error deleting company:', error)
      toast.error(`Failed to delete ${company.companyName}. Please try again.`)
    }
  }

  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod)
    setIsPaymentMethodModalOpen(true)
  }

  const handlePaymentMethodModalClose = () => {
    setIsPaymentMethodModalOpen(false)
    setEditingPaymentMethod(undefined)
  }

  const handleDeletePaymentMethod = async (paymentMethod: PaymentMethod) => {
    try {
      await callApi(`/payment-methods/${paymentMethod._id}`, {
        method: 'DELETE',
        userId: getUserId(),
      })
      toast.success(`${paymentMethod.name} deleted successfully`)
      refetchAll()
    } catch (error) {
      console.error('Error deleting payment method:', error)
      toast.error(`Failed to delete ${paymentMethod.name}. Please try again.`)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Icon name="lucide:Loader2" className="animate-spin" />
          <P>Loading settings...</P>
        </div>
      </div>
    )
  }

  const totalDeleted = Object.values(deletedItems).reduce((sum, items) => sum + items.length, 0)

  return (
    <div className="max-w-7xl w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <Tabs defaultValue="business" className="space-y-8">
          <TabsList>
            <TabsTrigger value="business">
              <Icon name="lucide:Building2" />
              Your Business
            </TabsTrigger>
            <TabsTrigger value="payment-methods">
              <Icon name="lucide:CreditCard" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="deleted-items">
              <Icon name="lucide:Trash2" />
              Deleted Items {totalDeleted > 0 && <span className="ml-2">({totalDeleted})</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <Card variant={isMobile ? 'ghost' : 'floating'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name="lucide:Building2" />
                    <div>
                      <H2 size="h3">Your Business</H2>
                      <P>Configure your business information for invoices and quotes</P>
                    </div>
                  </div>
                  <Button onClick={() => setIsCompanyModalOpen(true)}>
                    <Icon name="lucide:Plus" />
                    Add Company
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {companies.length === 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <Icon name="lucide:Building2" />
                    <H3 size="h4">No companies yet</H3>
                    <P>Add your business information to appear on invoices and quotes</P>
                    <Button onClick={() => setIsCompanyModalOpen(true)}>
                      <Icon name="lucide:Plus" />
                      Add Your Business
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {companies.map(company => (
                      <CompanyCard
                        key={company._id}
                        company={company}
                        onEdit={handleEditCompany}
                        onDelete={handleDeleteCompany}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-methods">
            <Card variant={isMobile ? 'ghost' : 'floating'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name="lucide:CreditCard" />
                    <div>
                      <H2 size="h3">Payment Methods</H2>
                      <P>Configure how you receive payments from clients</P>
                    </div>
                  </div>
                  <Button onClick={() => setIsPaymentMethodModalOpen(true)}>
                    <Icon name="lucide:Plus" />
                    Add Payment Method
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <Icon name="lucide:CreditCard" />
                    <H3 size="h4">No payment methods yet</H3>
                    <P>Add your first payment method to start receiving payments from clients</P>
                    <Button onClick={() => setIsPaymentMethodModalOpen(true)}>
                      <Icon name="lucide:Plus" />
                      Add First Payment Method
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paymentMethods.map(paymentMethod => (
                      <PaymentMethodCard
                        key={paymentMethod._id}
                        paymentMethod={paymentMethod}
                        onEdit={handleEditPaymentMethod}
                        onDelete={handleDeletePaymentMethod}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deleted-items">
            <Card variant={isMobile ? 'ghost' : 'floating'}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon name="lucide:RefreshCw" />
                  <div>
                    <H2 size="h3">Recover Deleted Items</H2>
                    <P>
                      Items shown here have been deleted but can be restored or permanently removed
                    </P>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <DeletedItemsManager
                  title="Clients"
                  items={deletedItems.clients}
                  type="clients"
                  getDisplayName={(item: Client) => item.clientName}
                  getDescription={(item: Client) => item.email || 'No email'}
                  onRestore={id => handleRestore('clients', id)}
                  onHardDelete={id => handleHardDelete('clients', id)}
                />

                <DeletedItemsManager
                  title="Companies"
                  items={deletedItems.companies}
                  type="companies"
                  getDisplayName={(item: Company) => item.companyName}
                  getDescription={(item: Company) => item.email || 'No email'}
                  onRestore={id => handleRestore('companies', id)}
                  onHardDelete={id => handleHardDelete('companies', id)}
                />

                <DeletedItemsManager
                  title="Quotes"
                  items={deletedItems.quotes}
                  type="quotes"
                  getDisplayName={(item: Quote) => item.documentNumber}
                  getDescription={(item: Quote) => `${item.total.toFixed(2)} ${item.currency}`}
                  onRestore={id => handleRestore('quotes', id)}
                  onHardDelete={id => handleHardDelete('quotes', id)}
                />

                <DeletedItemsManager
                  title="Invoices"
                  items={deletedItems.invoices}
                  type="invoices"
                  getDisplayName={(item: Invoice) => item.documentNumber}
                  getDescription={(item: Invoice) => `${item.total.toFixed(2)} ${item.currency}`}
                  onRestore={id => handleRestore('invoices', id)}
                  onHardDelete={id => handleHardDelete('invoices', id)}
                />

                <DeletedItemsManager
                  title="Receipts"
                  items={deletedItems.receipts}
                  type="receipts"
                  getDisplayName={(item: Receipt) => item.documentNumber}
                  getDescription={(item: Receipt) => `${item.total.toFixed(2)} ${item.currency}`}
                  onRestore={id => handleRestore('receipts', id)}
                  onHardDelete={id => handleHardDelete('receipts', id)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={handleCompanyModalClose}
        company={editingCompany}
        onSave={refetchAll}
      />

      <PaymentMethodModal
        isOpen={isPaymentMethodModalOpen}
        onClose={handlePaymentMethodModalClose}
        paymentMethod={editingPaymentMethod}
        onSave={refetchAll}
      />
    </div>
  )
}
