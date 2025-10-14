'use client'

import { ClientModal } from '@/components/client-modal'
import ClientCard from '@/components/ClientCard_v2'
import { CompanyModal } from '@/components/company-modal'
import DashboardSection from '@/components/DashboardSection'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import FirstActionCard from '@/components/FirstActionCard'
import { PaymentMethodModal } from '@/components/payment-method-modal'
import StatsCard from '@/components/StatsCard'
import { useBillingContext } from '@/contexts/billing-context'
import { getUserId } from '@/utils/get-user-id'
import { Client, Company, PaymentMethod } from '@ezbill/types'
import { useAuth } from '@ezstart/auth-sdk'
import { Card, CardContent, CardHeader, ChartContainer, ChartTooltip, ChartTooltipContent, H3, Main } from '@ezstart/ui/components'
import { callApi } from '@ezstart/ui/utils'
import { redirect, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'

const DashboardPageOld = () => {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const {
    clients,
    companies,
    paymentMethods,
    invoices,
    quotes,
    receipts,
    refetchAll,
    loading,
  } = useBillingContext()
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

  if (!isAuthenticated || !user) {
    redirect('/')
    return null
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

  // Sort clients by latest activity
  const getClientLatestActivity = (clientId: string): Date => {
    const clientInvoices = allInvoices.filter(inv => inv.clientId === clientId)
    const clientQuotes = allQuotes.filter(q => q.clientId === clientId)
    const clientReceipts = allReceipts.filter(r => r.clientId === clientId)

    const dates = [
      ...clientInvoices.map(inv => new Date(inv.updatedAt || inv.createdAt)),
      ...clientQuotes.map(q => new Date(q.updatedAt || q.createdAt)),
      ...clientReceipts.map(r => new Date(r.updatedAt || r.createdAt)),
    ]

    // Return most recent date or epoch if no activity
    return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(0)
  }

  const sortedClients = [...(clients || [])].sort((a, b) => {
    return getClientLatestActivity(b._id).getTime() - getClientLatestActivity(a._id).getTime()
  })

  // Prepare chart data - Revenue over last 6 months
  const revenueChartData = useMemo(() => {
    const monthsData = new Map<string, number>()
    const now = new Date()

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthsData.set(monthKey, 0)
    }

    // Aggregate paid invoices by month
    allInvoices
      .filter(invoice => invoice.status === 'paid')
      .forEach(invoice => {
        const date = new Date(invoice.createdAt)
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        if (monthsData.has(monthKey)) {
          monthsData.set(monthKey, (monthsData.get(monthKey) || 0) + (invoice.total || 0))
        }
      })

    return Array.from(monthsData.entries()).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue * 100) / 100, // Round to 2 decimals
    }))
  }, [allInvoices])

  const chartConfig = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(var(--ezbill-payment))',
    },
  }

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
      <Main>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
        </div>
      </Main>
    )
  }

  return (
    <Main>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stats Section - Only show when there's data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
          />
          <StatsCard
            title="Invoices"
            value={allInvoices.length.toString()}
            icon="lucide:FileEdit"
            iconGradient="bg-gradient-invoice"
          />
          <StatsCard
            title="Quotes"
            value={allQuotes.length.toString()}
            icon="lucide:FileText"
            iconGradient="bg-gradient-receipt"
          />
        </div>

        {/* Revenue Chart */}
        <Card variant="floating">
          <CardHeader>
            <H3 size="h4">Revenue Over Time</H3>
            <p className="text-sm text-muted-foreground">Last 6 months revenue from paid invoices</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--ezbill-payment))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--ezbill-payment))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: any) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--ezbill-payment))"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

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
        {/* Clients Section */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {sortedClients.map(client => (
              <ClientCard
                key={client._id}
                client={client}
                onClick={handleClientClick}
                onEdit={handleEditClient}
                onDelete={handleDeleteClient}
              />
            ))}
          </div>
        </DashboardSection>
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
    </Main>
  )
}

export default DashboardPageOld
