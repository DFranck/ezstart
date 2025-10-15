'use client'

import CollapsibleGroup from '@/components/CollapsibleGroup'
import { CompanyModal } from '@/components/company-modal'
import CompanyCard from '@/components/CompanyCard_v2'
import DashboardSection from '@/components/DashboardSection'
import { PaymentMethodModal } from '@/components/payment-method-modal'
import PaymentMethodCard from '@/components/PaymentMethodCard_v2'
import { useBillingContext } from '@/contexts/billing-context'
import { groupCompaniesAsOne } from '@/utils/group-companies'
import { groupDeletedItems } from '@/utils/group-deleted-items'
import { groupPaymentMethodsByType } from '@/utils/group-payment-methods'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import { Icon, P, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { callApi } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getUserId } from '../../../utils/get-user-id'
import { DeletedItemCard } from './components/deleted-item-card'

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
    paymentMethods: [] as PaymentMethod[],
  })
  const [loading, setLoading] = useState(true)
  const { isMobile } = useDevice()
  const loadDeletedItems = async () => {
    try {
      setLoading(true)
      const userId = getUserId()
      const [clients, companies, quotes, invoices, receipts, paymentMethods] = await Promise.all([
        callApi('/clients?deletedOnly=true', { userId }),
        callApi('/companies?deletedOnly=true', { userId }),
        callApi('/quotes?deletedOnly=true', { userId }),
        callApi('/invoices?deletedOnly=true', { userId }),
        callApi('/receipts?deletedOnly=true', { userId }),
        callApi('/payment-methods?deletedOnly=true', { userId }),
      ])

      setDeletedItems({
        clients: clients.ok && Array.isArray(clients.data) ? clients.data : [],
        companies: companies.ok && Array.isArray(companies.data) ? companies.data : [],
        quotes: quotes.ok && Array.isArray(quotes.data) ? quotes.data : [],
        invoices: invoices.ok && Array.isArray(invoices.data) ? invoices.data : [],
        receipts: receipts.ok && Array.isArray(receipts.data) ? receipts.data : [],
        paymentMethods:
          paymentMethods.ok && Array.isArray(paymentMethods.data) ? paymentMethods.data : [],
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

  // Map type to API endpoint
  const getApiEndpoint = (type: string): string => {
    if (type === 'paymentMethods') return 'payment-methods'
    return type
  }

  const handleRestore = async (type: string, id: string) => {
    try {
      const endpoint = getApiEndpoint(type)
      await callApi(`/${endpoint}/${id}/restore`, {
        method: 'POST',
        userId: getUserId(),
      })
      toast.success('Item restored successfully')
      refetchAll()
      await loadDeletedItems() // Refresh the list
    } catch (error) {
      console.error(`Error restoring ${type}:`, error)
      toast.error('Failed to restore item')
    }
  }

  const handleHardDelete = async (type: string, id: string) => {
    try {
      const endpoint = getApiEndpoint(type)
      await callApi(`/${endpoint}/${id}?permanent=true`, {
        method: 'DELETE',
        userId: getUserId(),
      })
      toast.success('Item permanently deleted')
      await loadDeletedItems() // Refresh the list
    } catch (error) {
      console.error(`Error permanently deleting ${type}:`, error)
      toast.error('Failed to permanently delete item')
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
      loadDeletedItems() // Refresh deleted items list
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
      loadDeletedItems() // Refresh deleted items list
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

  // Group data
  const companyGroups = groupCompaniesAsOne(companies)
  const paymentMethodGroups = groupPaymentMethodsByType(paymentMethods)
  const deletedItemGroups = groupDeletedItems(deletedItems)

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
            <DashboardSection
              title="Your Business"
              description="Configure your business information for invoices and quotes"
              icon="lucide:Building2"
              iconGradient="bg-gradient-company"
              onAdd={() => setIsCompanyModalOpen(true)}
              addButtonText="Add Company"
              addButtonIcon="lucide:Plus"
              addButtonGradient="bg-gradient-company"
              isEmpty={companies.length === 0}
              emptyState={{
                icon: 'lucide:Building2',
                iconBg: 'bg-gradient-company/10',
                title: 'No companies yet',
                description: 'Add your business information to appear on invoices and quotes',
                buttonText: 'Add Your Business',
              }}
              className={isMobile ? 'border-0 shadow-none' : ''}
            >
              <CollapsibleGroup
                groups={companyGroups}
                renderItem={company => (
                  <CompanyCard
                    company={company}
                    onEdit={handleEditCompany}
                    onDelete={handleDeleteCompany}
                  />
                )}
                getItemKey={company => company._id}
                defaultOpenAll={true}
                showToggleAll={false}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              />
            </DashboardSection>
          </TabsContent>

          <TabsContent value="payment-methods">
            <DashboardSection
              title="Payment Methods"
              description="Configure how you receive payments from clients"
              icon="lucide:CreditCard"
              iconGradient="bg-gradient-payment"
              onAdd={() => setIsPaymentMethodModalOpen(true)}
              addButtonText="Add Payment Method"
              addButtonIcon="lucide:Plus"
              addButtonGradient="bg-gradient-payment"
              isEmpty={paymentMethods.length === 0}
              emptyState={{
                icon: 'lucide:CreditCard',
                iconBg: 'bg-gradient-payment/10',
                title: 'No payment methods yet',
                description:
                  'Add your first payment method to start receiving payments from clients',
                buttonText: 'Add First Payment Method',
              }}
              className={isMobile ? 'border-0 shadow-none' : ''}
            >
              <CollapsibleGroup
                groups={paymentMethodGroups}
                renderItem={paymentMethod => (
                  <PaymentMethodCard
                    paymentMethod={paymentMethod}
                    onEdit={handleEditPaymentMethod}
                    onDelete={handleDeletePaymentMethod}
                  />
                )}
                getItemKey={paymentMethod => paymentMethod._id}
                defaultOpenAll={true}
                showToggleAll={paymentMethodGroups.length > 1}
                // className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              />
            </DashboardSection>
          </TabsContent>

          <TabsContent value="deleted-items">
            <DashboardSection
              title="Recover Deleted Items"
              description="Items shown here have been deleted but can be restored or permanently removed"
              icon="lucide:RefreshCw"
              iconGradient="bg-gradient-receipt"
              hideAddButton
              className={isMobile ? 'border-0 shadow-none' : ''}
            >
              {deletedItemGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deleted items found.
                </div>
              ) : (
                <CollapsibleGroup
                  groups={deletedItemGroups}
                  renderItem={({ type, item }) => (
                    <DeletedItemCard
                      item={item}
                      type={type}
                      onRestore={id => handleRestore(type, id)}
                      onHardDelete={id => handleHardDelete(type, id)}
                    />
                  )}
                  getItemKey={({ item }) => item._id}
                  defaultOpenAll={false}
                  showToggleAll={true}
                />
              )}
            </DashboardSection>
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
