'use client'

import CollapsibleGroup from '@/components/CollapsibleGroup'
import { CompanyModal } from '@/components/company-modal'
import CompanyCard from '@/components/CompanyCard_v2'
import DashboardSection from '@/components/DashboardSection'
import { PaymentMethodModal } from '@/components/payment-method-modal'
import PaymentMethodCard from '@/components/PaymentMethodCard_v2'
import { useBillingContext } from '@/contexts/billing-context'
import { useInvalidateBilling } from '@/hooks/useBillingQueries'
import { callApi } from '@/config/api'
import { groupCompaniesAsOne } from '@/utils/group-companies'
import { groupDeletedItems } from '@/utils/group-deleted-items'
import { groupPaymentMethodsByType } from '@/utils/group-payment-methods'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import {
  Icon,
  Skeleton,
  SkeletonCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Div,
  Span,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { useState } from 'react'
import { useAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { DeletedItemCard } from './components/deleted-item-card'

export default function SettingsPage() {
  const { companies, paymentMethods, refetchAll } = useBillingContext()
  const { user } = useAuth()
  const {
    invalidateClients,
    invalidateCompanies,
    invalidateQuotes,
    invalidateInvoices,
    invalidateReceipts,
    invalidatePaymentMethods,
  } = useInvalidateBilling()
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined)
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false)
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | undefined>(
    undefined
  )
  const { isMobile } = useDevice()
  const queryClient = useQueryClient()
  const t = useTranslations()
  const tToast = useTranslations('toast')
  const tSettings = useTranslations('settings')

  const { data: deletedItems, isLoading: loading } = useQuery({
    queryKey: ['deleted-items', user?._id],
    queryFn: async () => {
      const userId = user?._id
      const [clients, companies, quotes, invoices, receipts, paymentMethods] = await Promise.all([
        callApi('/clients?deletedOnly=true&limit=100', { userId }),
        callApi('/companies?deletedOnly=true&limit=100', { userId }),
        callApi('/quotes?deletedOnly=true&limit=100', { userId }),
        callApi('/invoices?deletedOnly=true&limit=100', { userId }),
        callApi('/receipts?deletedOnly=true&limit=100', { userId }),
        callApi('/payment-methods?deletedOnly=true&limit=100', { userId }),
      ])

      // With auto-unwrap, response.data is already the array
      const extractItems = (response: any) => {
        if (!response.ok || !response.data) return []
        if (Array.isArray(response.data)) return response.data
        return []
      }

      return {
        clients: extractItems(clients) as Client[],
        companies: extractItems(companies) as Company[],
        quotes: extractItems(quotes) as Quote[],
        invoices: extractItems(invoices) as Invoice[],
        receipts: extractItems(receipts) as Receipt[],
        paymentMethods: extractItems(paymentMethods) as PaymentMethod[],
      }
    },
    enabled: !!user?._id,
    staleTime: 30000,
  })

  const invalidateDeletedItems = () => {
    queryClient.invalidateQueries({ queryKey: ['deleted-items'] })
  }

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
        userId: user?._id,
      })
      toast.success(tToast('itemRestored'))
      invalidateResourceType(type) // Invalidate only the specific resource
      invalidateDeletedItems() // Refresh the deleted items list
    } catch (error) {
      logger.error(`Error restoring ${type}:`, error)
      toast.error(tToast('itemRestoreFailed'))
    }
  }

  // Helper to invalidate only the specific resource type
  const invalidateResourceType = (type: string) => {
    switch (type) {
      case 'clients':
        invalidateClients()
        break
      case 'companies':
        invalidateCompanies()
        break
      case 'quotes':
        invalidateQuotes()
        break
      case 'invoices':
        invalidateInvoices()
        break
      case 'receipts':
        invalidateReceipts()
        break
      case 'paymentMethods':
        invalidatePaymentMethods()
        break
    }
  }

  const handleHardDelete = async (type: string, id: string) => {
    try {
      const endpoint = getApiEndpoint(type)
      await callApi(`/${endpoint}/${id}/hard-delete`, {
        method: 'DELETE',
        userId: user?._id,
      })
      toast.success(tToast('itemDeleted'))
      invalidateResourceType(type) // Invalidate only the specific resource
      invalidateDeletedItems() // Refresh the deleted items list
    } catch (error) {
      logger.error(`Error permanently deleting ${type}:`, error)
      toast.error(tToast('itemDeleteFailed'))
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
        userId: user?._id,
      })
      toast.success(tToast('companyDeleteSuccess', { name: company.companyName }))
      refetchAll()
      invalidateDeletedItems() // Refresh deleted items list
    } catch (error) {
      logger.error('Error deleting company:', error)
      toast.error(tToast('companyDeleteFailed', { name: company.companyName }))
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
        userId: user?._id,
      })
      toast.success(tToast('paymentMethodDeleteSuccess', { name: paymentMethod.name }))
      refetchAll()
      invalidateDeletedItems() // Refresh deleted items list
    } catch (error) {
      logger.error('Error deleting payment method:', error)
      toast.error(tToast('paymentMethodDeleteFailed', { name: paymentMethod.name }))
    }
  }

  if (loading) {
    return (
      <Div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Tabs skeleton */}
        <Div className="flex gap-2 border-b">
          <Skeleton className="h-10 w-32" variant="shimmer" />
          <Skeleton className="h-10 w-32" variant="shimmer" />
          <Skeleton className="h-10 w-32" variant="shimmer" />
        </Div>
        {/* Content skeleton */}
        <Div className="space-y-4">
          <SkeletonCard showHeader showFooter={false} lines={3} variant="shimmer" size="lg" />
          <SkeletonCard showHeader showFooter={false} lines={2} variant="shimmer" size="lg" />
        </Div>
      </Div>
    )
  }

  const safeDeletedItems = deletedItems ?? {
    clients: [] as Client[],
    companies: [] as Company[],
    quotes: [] as Quote[],
    invoices: [] as Invoice[],
    receipts: [] as Receipt[],
    paymentMethods: [] as PaymentMethod[],
  }
  const totalDeleted = Object.values(safeDeletedItems).reduce((sum, items) => sum + items.length, 0)

  // Group data
  const companyGroups = groupCompaniesAsOne(companies)
  const paymentMethodGroups = groupPaymentMethodsByType(paymentMethods)
  const deletedItemGroups = groupDeletedItems(safeDeletedItems)

  return (
    <Div className="max-w-7xl w-full mx-auto py-6 sm:py-8 space-y-6">
      <Div>
        <Tabs defaultValue="business" className="space-y-8 mx-2 md:mx-4 lg:mx-6">
          <TabsList>
            <TabsTrigger value="business">
              <Icon name="lucide:Building2" />
              {tSettings('yourBusiness')}
            </TabsTrigger>
            <TabsTrigger value="payment-methods">
              <Icon name="lucide:CreditCard" />
              {tSettings('paymentMethods')}
            </TabsTrigger>
            <TabsTrigger value="deleted-items">
              <Icon name="lucide:Trash2" />
              {tSettings('deletedItems')}{' '}
              {totalDeleted > 0 && <Span className="ml-2">({totalDeleted})</Span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <DashboardSection
              title={tSettings('yourBusiness')}
              description={tSettings('businessDesc')}
              icon="lucide:Building2"
              iconGradient="bg-gradient-company"
              onAdd={() => setIsCompanyModalOpen(true)}
              addButtonText={tSettings('addCompany')}
              addButtonIcon="lucide:Plus"
              addButtonGradient="bg-gradient-company"
              isEmpty={companies.length === 0}
              emptyState={{
                icon: 'lucide:Building2',
                iconBg: 'bg-gradient-company/10',
                title: tSettings('noCompaniesYet'),
                description: tSettings('noCompaniesDesc'),
                buttonText: tSettings('addYourBusiness'),
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
              title={tSettings('paymentMethods')}
              description={tSettings('paymentMethodsDesc')}
              icon="lucide:CreditCard"
              iconGradient="bg-gradient-payment"
              onAdd={() => setIsPaymentMethodModalOpen(true)}
              addButtonText={tSettings('addPaymentMethod')}
              addButtonIcon="lucide:Plus"
              addButtonGradient="bg-gradient-payment"
              isEmpty={paymentMethods.length === 0}
              emptyState={{
                icon: 'lucide:CreditCard',
                iconBg: 'bg-gradient-payment/10',
                title: tSettings('noPaymentMethodsYet'),
                description: tSettings('noPaymentMethodsDesc'),
                buttonText: tSettings('addFirstPaymentMethod'),
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
              title={tSettings('recoverDeleted')}
              description={tSettings('recoverDesc')}
              icon="lucide:RefreshCw"
              iconGradient="bg-gradient-receipt"
              hideAddButton
              className={isMobile ? 'border-0 shadow-none' : ''}
            >
              {deletedItemGroups.length === 0 ? (
                <Div className="text-center py-8 text-muted-foreground">
                  {tSettings('noDeletedItems')}
                </Div>
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
      </Div>

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
    </Div>
  )
}
