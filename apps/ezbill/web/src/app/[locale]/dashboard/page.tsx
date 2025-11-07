'use client'

import ClientCard from '@/components/ClientCard_v2'
import CollapsibleGroup from '@/components/CollapsibleGroup'
import DashboardSection from '@/components/DashboardSection'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import FirstActionCard from '@/components/FirstActionCard'
import { RevenueChart } from '@/components/RevenueChart'
import StatsCard from '@/components/StatsCard'
import { TopClientsChart } from '@/components/TopClientsChart'
import { useBillingContext } from '@/contexts/billing-context'
import { callApi } from '@/utils/api'
import { getUserId } from '@/utils/get-user-id'
import { groupClientsByActivity } from '@/utils/group-clients'
import { Client, Company, PaymentMethod } from '@ezbill/types'
import { useAuth } from '@ezstart/auth-sdk'
import { Div, Spinner, SkeletonCard, Skeleton, WelcomeModal } from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

// Dynamic imports for modals (lazy load on demand) - Performance optimization
const ClientModal = dynamic(() => import('@/components/client-modal').then(mod => ({ default: mod.ClientModal })), {
  loading: () => null,
  ssr: false
})

const CompanyModal = dynamic(() => import('@/components/company-modal').then(mod => ({ default: mod.CompanyModal })), {
  loading: () => null,
  ssr: false
})

const PaymentMethodModal = dynamic(() => import('@/components/payment-method-modal').then(mod => ({ default: mod.PaymentMethodModal })), {
  loading: () => null,
  ssr: false
})

const DashboardPage = (): any => {
  const router = useRouter()
  const { user, isAuthenticated, login } = useAuth()
  const { clients, companies, paymentMethods, invoices, quotes, receipts, refetchAll, loading } =
    useBillingContext()
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
      <div className="flex flex-1 flex-col items-center justify-center">
        <Spinner variant="fancy" size="xl" text="Checking authentication..." textSize="md" />
      </div>
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
          userId: getUserId(),
        })
      } else if (deleteDialog.type === 'client') {
        await callApi(`/clients/${deleteDialog.item._id}`, {
          method: 'DELETE',
          userId: getUserId(),
        })
      } else if (deleteDialog.type === 'payment-method') {
        await callApi(`/payment-methods/${deleteDialog.item._id}`, {
          method: 'DELETE',
          userId: getUserId(),
        })
      }
      toast.success(`${itemName} deleted successfully`)
      refetchAll()
    } catch (error) {
      console.error(`Error deleting ${deleteDialog.type}:`, error)
      toast.error(`Failed to delete ${itemName}. Please try again.`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 space-y-6 w-full">
        {/* Stats + Chart Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Div layout={'col'}>
            <Skeleton className="h-24 w-full rounded-xl" variant="shimmer" />
            <Skeleton className="h-24 w-full rounded-xl hidden md:block" variant="shimmer" />
            <Skeleton className="h-24 w-full rounded-xl hidden md:block" variant="shimmer" />
            <Skeleton className="h-24 w-full rounded-xl hidden md:block" variant="shimmer" />
          </Div>
          <Skeleton className="h-96 w-full rounded-xl" variant="shimmer" />
        </div>

        {/* Top Clients Chart Skeleton */}
        <Skeleton className="h-64 w-full rounded-xl" variant="shimmer" />

        {/* Clients Grid Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" variant="shimmer" />
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} showHeader showFooter={false} lines={2} variant="shimmer" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Check if there's any meaningful data to show
  const hasData = hasClients && (allInvoices.length > 0 || allQuotes.length > 0 || allReceipts.length > 0)

  return (
    <>
      <WelcomeModal
        appName="EZBill"
        title="Welcome to EZBill! 💼"
        description="Professional invoicing and billing made simple"
        features={[
          {
            icon: "lucide:FileText",
            title: "Create Invoices & Quotes",
            description: "Generate professional invoices and quotes in seconds with customizable templates"
          },
          {
            icon: "lucide:Users",
            title: "Manage Clients",
            description: "Keep track of all your clients and companies in one organized dashboard"
          },
          {
            icon: "lucide:CreditCard",
            title: "Track Payments",
            description: "Monitor payment status, send reminders, and accept multiple payment methods"
          },
          {
            icon: "lucide:BarChart3",
            title: "Revenue Analytics",
            description: "Visualize your revenue trends and identify your top clients with insightful charts"
          }
        ]}
        ctaText="Start Creating"
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 space-y-6 w-full">
        {/* Stats Section - Only show when there's meaningful data */}
        {hasData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Div layout={'col'}>
              <StatsCard
                title="Total Revenue"
                value={`$${totalRevenue.toFixed(2)}`}
                icon="lucide:DollarSign"
                iconGradient="bg-gradient-payment"
              />
              <StatsCard
                title="Pending"
                value={`$${pendingAmount.toFixed(2)}`}
                icon="lucide:Clock"
                iconGradient="bg-gradient-to-r from-orange-400 to-red-400"
                className="hidden md:flex"
              />
              <StatsCard
                title="Total Invoices"
                value={allInvoices.length.toString()}
                icon="lucide:FileEdit"
                iconGradient="bg-gradient-invoice"
                className="hidden md:flex"
              />
              <StatsCard
                title="Total Quotes"
                value={allQuotes.length.toString()}
                icon="lucide:FileText"
                iconGradient="bg-gradient-receipt"
                className="hidden md:flex"
              />
            </Div>

            <RevenueChart invoices={allInvoices} className="h-fit" />
          </div>
        )}
        {/* Quick Actions - Only show when missing data */}
        {(!hasCompanies || !hasClients || paymentMethods.length === 0) && (
          <div className="flex flex-wrap gap-4 sm:gap-6 mb-6 sm:mb-8">
            {!hasCompanies && (
              <FirstActionCard
                title="Create Company"
                description="Set up your business profile and billing information"
                setter={setIsCompanyModalOpen}
                className="bg-gradient-company text-white"
                descriptionClassName="text-primary-foreground/80"
              />
            )}

            {!hasClients && (
              <FirstActionCard
                title="Create Client"
                description="Add clients to start creating invoices and quotes"
                setter={setIsClientModalOpen}
                className="bg-gradient-client text-white"
                descriptionClassName="text-primary-foreground/80"
              />
            )}
            {paymentMethods.length === 0 && (
              <FirstActionCard
                title="Add Payment Method"
                description="Configure how you receive payments from clients"
                setter={setIsPaymentMethodModalOpen}
                className="bg-gradient-payment text-white"
                descriptionClassName="text-primary-foreground/80"
              />
            )}
          </div>
        )}

        {/* Charts Section - Only show when there are invoices */}
        {allInvoices.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <TopClientsChart invoices={allInvoices} clients={clients} className="h-fit" />
          </div>
        )}

        {/* Clients Section - Always show if user has companies/payment methods set up */}
        {hasCompanies && paymentMethods.length > 0 && (
          <DashboardSection
            title="Clients"
            description="Click on a client to manage their billing"
            icon="lucide:Users"
            iconGradient="bg-gradient-client"
            onAdd={() => setIsClientModalOpen(true)}
            addButtonText="Add Client"
            addButtonIcon="lucide:UserPlus"
            addButtonGradient="bg-gradient-client hover:bg-gradient-client-hover"
            isEmpty={!hasClients}
            emptyState={{
              icon: 'lucide:Users',
              iconBg: 'bg-gradient-client-light text-ezbill-client',
              title: 'No clients yet',
              description: 'Add your first client to start creating invoices and quotes',
              buttonText: 'Add First Client',
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
      </div>

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
        title={`Delete ${deleteDialog.type === 'company' ? 'Company' : deleteDialog.type === 'client' ? 'Client' : 'Payment Method'}`}
        description={`Are you sure you want to delete "${
          deleteDialog.item
            ? deleteDialog.type === 'company'
              ? (deleteDialog.item as Company).companyName
              : deleteDialog.type === 'client'
                ? (deleteDialog.item as Client).clientName
                : (deleteDialog.item as PaymentMethod).name
            : ''
        }"? This can be undone from Settings.`}
      />
    </>
  )
}

export default DashboardPage
