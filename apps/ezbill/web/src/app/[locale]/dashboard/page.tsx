'use client'

import ClientCard from '@/components/ClientCard_v2'
import CollapsibleGroup from '@/components/CollapsibleGroup'
import DashboardSection from '@/components/DashboardSection'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import FirstActionCard from '@/components/FirstActionCard'
import StatsCard from '@/components/StatsCard'
import { useBillingContext } from '@/contexts/billing-context'
import { callApi } from '@/config/api'
import { groupClientsByActivity } from '@/utils/group-clients'
import { Client, Company, PaymentMethod } from '@ezbill/types'
import { useAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { Div, Spinner, SkeletonCard, Skeleton, WelcomeModal } from '@ezstart/ui/components'
import dynamic from 'next/dynamic'

// Dynamic imports for chart components (recharts ~200KB, lazy-loaded)
const RevenueChart = dynamic(
  () => import('@/components/RevenueChart').then(mod => ({ default: mod.RevenueChart })),
  {
    ssr: false,
    loading: () => <Div className="h-64 animate-pulse bg-muted rounded" />,
  }
)

const TopClientsChart = dynamic(
  () => import('@/components/TopClientsChart').then(mod => ({ default: mod.TopClientsChart })),
  {
    ssr: false,
    loading: () => <Div className="h-64 animate-pulse bg-muted rounded" />,
  }
)
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

// Dynamic imports for modals (lazy load on demand) - Performance optimization
const ClientModal = dynamic(
  () => import('@/components/client-modal').then(mod => ({ default: mod.ClientModal })),
  {
    loading: () => null,
    ssr: false,
  }
)

const CompanyModal = dynamic(
  () => import('@/components/company-modal').then(mod => ({ default: mod.CompanyModal })),
  {
    loading: () => null,
    ssr: false,
  }
)

const PaymentMethodModal = dynamic(
  () =>
    import('@/components/payment-method-modal').then(mod => ({ default: mod.PaymentMethodModal })),
  {
    loading: () => null,
    ssr: false,
  }
)

const DashboardPage = () => {
  const router = useRouter()
  const { user, isAuthenticated, login } = useAuth()
  const { clients, companies, paymentMethods, invoices, quotes, receipts, refetchAll, loading } =
    useBillingContext()
  const tToast = useTranslations('toast')
  const tDashboard = useTranslations('dashboard')
  const tWelcome = useTranslations('welcome')
  const tDelete = useTranslations('delete')
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    type: 'company' | 'client' | 'payment-method'
    item: Company | Client | PaymentMethod | null
  }>({ isOpen: false, type: 'client', item: null })
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false)
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | undefined>(
    undefined
  )

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      login()
    }
  }, [isAuthenticated, loading, login])

  // Show loading while checking auth
  if (!isAuthenticated || !user) {
    return (
      <Div className="flex flex-1 flex-col items-center justify-center">
        <Spinner variant="fancy" size="xl" text={tDashboard('checkingAuth')} textSize="md" />
      </Div>
    )
  }

  const hasClients = clients && clients.length > 0
  const hasCompanies = companies && companies.length > 0

  // Calculate global stats
  const allInvoices = invoices || []
  const allQuotes = quotes || []
  const allReceipts = receipts || []

  const totalRevenue = allInvoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + (invoice.total || 0), 0)

  const pendingAmount = allInvoices
    .filter(invoice => invoice.status === 'sent' || invoice.status === 'draft')
    .reduce((sum, invoice) => sum + (invoice.total || 0), 0)

  // Group clients by activity
  const clientGroups = groupClientsByActivity(clients || [], allInvoices, allQuotes, allReceipts)

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company)
    setIsCompanyModalOpen(true)
  }

  const handleCompanyModalClose = () => {
    setIsCompanyModalOpen(false)
    setEditingCompany(undefined)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsClientModalOpen(true)
  }

  const handleClientModalClose = () => {
    setIsClientModalOpen(false)
    setEditingClient(undefined)
  }

  const handleClientClick = (client: Client) => {
    router.push(`/dashboard/${client._id}`)
  }

  const handleDeleteCompany = (company: Company) => {
    setDeleteDialog({ isOpen: true, type: 'company', item: company })
  }

  const handleDeleteClient = (client: Client) => {
    setDeleteDialog({ isOpen: true, type: 'client', item: client })
  }

  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod)
    setIsPaymentMethodModalOpen(true)
  }

  const handlePaymentMethodModalClose = () => {
    setIsPaymentMethodModalOpen(false)
    setEditingPaymentMethod(undefined)
  }

  const handleDeletePaymentMethod = (paymentMethod: PaymentMethod) => {
    setDeleteDialog({ isOpen: true, type: 'payment-method', item: paymentMethod })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.item) return

    const itemName =
      deleteDialog.type === 'company'
        ? (deleteDialog.item as Company).companyName
        : deleteDialog.type === 'client'
          ? (deleteDialog.item as Client).clientName
          : (deleteDialog.item as PaymentMethod).name

    try {
      if (deleteDialog.type === 'company') {
        await callApi(`/companies/${deleteDialog.item._id}`, {
          method: 'DELETE',
          userId: user?._id,
        })
      } else if (deleteDialog.type === 'client') {
        await callApi(`/clients/${deleteDialog.item._id}`, {
          method: 'DELETE',
          userId: user?._id,
        })
      } else if (deleteDialog.type === 'payment-method') {
        await callApi(`/payment-methods/${deleteDialog.item._id}`, {
          method: 'DELETE',
          userId: user?._id,
        })
      }
      toast.success(tToast('deleteSuccess', { name: itemName }))
      refetchAll()
    } catch (error) {
      logger.error(`Error deleting ${deleteDialog.type}:`, error)
      toast.error(tToast('deleteFailed', { name: itemName }))
    }
  }

  if (loading) {
    return (
      <Div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 space-y-6 w-full">
        {/* Stats + Chart Skeleton */}
        <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Div layout={'col'}>
            <Skeleton className="h-24 w-full rounded-xl" variant="shimmer" />
            <Skeleton className="h-24 w-full rounded-xl hidden md:block" variant="shimmer" />
            <Skeleton className="h-24 w-full rounded-xl hidden md:block" variant="shimmer" />
            <Skeleton className="h-24 w-full rounded-xl hidden md:block" variant="shimmer" />
          </Div>
          <Skeleton className="h-96 w-full rounded-xl" variant="shimmer" />
        </Div>

        {/* Top Clients Chart Skeleton */}
        <Skeleton className="h-64 w-full rounded-xl" variant="shimmer" />

        {/* Clients Grid Skeleton */}
        <Div className="space-y-4">
          <Skeleton className="h-8 w-48" variant="shimmer" />
          <Div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} showHeader showFooter={false} lines={2} variant="shimmer" />
            ))}
          </Div>
        </Div>
      </Div>
    )
  }

  // Check if there's any meaningful data to show
  const hasData =
    hasClients && (allInvoices.length > 0 || allQuotes.length > 0 || allReceipts.length > 0)

  return (
    <>
      <WelcomeModal
        appName="EZBill"
        title={tWelcome('title')}
        description={tWelcome('description')}
        features={[
          {
            icon: 'lucide:FileText',
            title: tWelcome('createInvoices'),
            description: tWelcome('createInvoicesDesc'),
          },
          {
            icon: 'lucide:Users',
            title: tWelcome('manageClients'),
            description: tWelcome('manageClientsDesc'),
          },
          {
            icon: 'lucide:CreditCard',
            title: tWelcome('trackPayments'),
            description: tWelcome('trackPaymentsDesc'),
          },
          {
            icon: 'lucide:BarChart3',
            title: tWelcome('revenueAnalytics'),
            description: tWelcome('revenueAnalyticsDesc'),
          },
        ]}
        ctaText={tWelcome('startCreating')}
      />

      <Div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 space-y-6 w-full">
        {/* Stats Section - Only show when there's meaningful data */}
        {hasData && (
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Div layout={'col'}>
              <StatsCard
                title={tDashboard('totalRevenue')}
                value={`$${totalRevenue.toFixed(2)}`}
                icon="lucide:DollarSign"
                iconGradient="bg-gradient-payment"
              />
              <StatsCard
                title={tDashboard('pending')}
                value={`$${pendingAmount.toFixed(2)}`}
                icon="lucide:Clock"
                iconGradient="bg-gradient-to-r from-orange-400 to-red-400"
                className="hidden md:flex"
              />
              <StatsCard
                title={tDashboard('totalInvoices')}
                value={allInvoices.length.toString()}
                icon="lucide:FileEdit"
                iconGradient="bg-gradient-invoice"
                className="hidden md:flex"
              />
              <StatsCard
                title={tDashboard('totalQuotes')}
                value={allQuotes.length.toString()}
                icon="lucide:FileText"
                iconGradient="bg-gradient-receipt"
                className="hidden md:flex"
              />
            </Div>

            <RevenueChart invoices={allInvoices} className="h-fit" />
          </Div>
        )}
        {/* Quick Actions - Only show when missing data */}
        {(!hasCompanies || !hasClients || paymentMethods.length === 0) && (
          <Div className="flex flex-wrap gap-4 sm:gap-6 mb-6 sm:mb-8">
            {!hasCompanies && (
              <FirstActionCard
                title={tDashboard('createCompany')}
                description={tDashboard('createCompanyDesc')}
                setter={setIsCompanyModalOpen}
                className="bg-gradient-company text-white"
                descriptionClassName="text-primary-foreground/80"
              />
            )}

            {!hasClients && (
              <FirstActionCard
                title={tDashboard('createClient')}
                description={tDashboard('createClientDesc')}
                setter={setIsClientModalOpen}
                className="bg-gradient-client text-white"
                descriptionClassName="text-primary-foreground/80"
              />
            )}
            {paymentMethods.length === 0 && (
              <FirstActionCard
                title={tDashboard('addPaymentMethod')}
                description={tDashboard('addPaymentMethodDesc')}
                setter={setIsPaymentMethodModalOpen}
                className="bg-gradient-payment text-white"
                descriptionClassName="text-primary-foreground/80"
              />
            )}
          </Div>
        )}

        {/* Charts Section - Only show when there are invoices */}
        {allInvoices.length > 0 && (
          <Div className="mb-6 sm:mb-8">
            <TopClientsChart invoices={allInvoices} clients={clients} className="h-fit" />
          </Div>
        )}

        {/* Clients Section - Always show if user has companies/payment methods set up */}
        {hasCompanies && paymentMethods.length > 0 && (
          <DashboardSection
            title={tDashboard('clients')}
            description={tDashboard('clickToManage')}
            icon="lucide:Users"
            iconGradient="bg-gradient-client"
            onAdd={() => setIsClientModalOpen(true)}
            addButtonText={tDashboard('addClient')}
            addButtonIcon="lucide:UserPlus"
            addButtonGradient="bg-gradient-client hover:bg-gradient-client-hover"
            isEmpty={!hasClients}
            emptyState={{
              icon: 'lucide:Users',
              iconBg: 'bg-gradient-client-light text-ezbill-client',
              title: tDashboard('noClientsYet'),
              description: tDashboard('noClientsDesc'),
              buttonText: tDashboard('addFirstClient'),
            }}
          >
            <CollapsibleGroup
              groups={clientGroups}
              renderItem={client => (
                <ClientCard
                  client={client}
                  onClick={handleClientClick}
                  onEdit={handleEditClient}
                  onDelete={handleDeleteClient}
                />
              )}
              getItemKey={client => client._id}
              defaultOpenAll={false}
              showToggleAll={true}
              className="grid grid-cols-1 gap-4 sm:gap-6"
            />
          </DashboardSection>
        )}
      </Div>

      {/* Modals */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={handleCompanyModalClose}
        company={editingCompany}
        onSave={refetchAll}
      />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={handleClientModalClose}
        client={editingClient}
        onSave={refetchAll}
      />

      <PaymentMethodModal
        isOpen={isPaymentMethodModalOpen}
        onClose={handlePaymentMethodModalClose}
        paymentMethod={editingPaymentMethod}
        onSave={refetchAll}
      />

      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, type: 'client', item: null })}
        onConfirm={confirmDelete}
        title={tDelete('title', {
          type:
            deleteDialog.type === 'company'
              ? 'Company'
              : deleteDialog.type === 'client'
                ? 'Client'
                : 'Payment Method',
        })}
        description={tDelete('description', {
          name: deleteDialog.item
            ? deleteDialog.type === 'company'
              ? (deleteDialog.item as Company).companyName
              : deleteDialog.type === 'client'
                ? (deleteDialog.item as Client).clientName
                : (deleteDialog.item as PaymentMethod).name
            : '',
        })}
      />
    </>
  )
}

export default DashboardPage
