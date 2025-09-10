'use client'

import { ClientModal } from '@/components/client-modal'
import ClientCard from '@/components/ClientCard_v2'
import { CompanyModal } from '@/components/company-modal'
import CompanyCard from '@/components/CompanyCard_v2'
import DashboardSection from '@/components/DashboardSection'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import FirstActionCard from '@/components/FirstActionCard'
import { PaymentMethodModal } from '@/components/payment-method-modal'
import PaymentMethodCard from '@/components/PaymentMethodCard_v2'
import StatsCard from '@/components/StatsCard'
import { useBillingContext } from '@/contexts/billing-context'
import { getUserId } from '@/utils/get-user-id'
import { Client, Company, PaymentMethod } from '@ez-billing/types'
import { useAuth } from '@ezstart/auth-sdk'
import { Main } from '@ezstart/ui/components'
import { callApi } from '@ezstart/ui/utils'
import { redirect, useRouter } from 'next/navigation'
import { useState } from 'react'

const DashboardPage = () => {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { clients, companies, paymentMethods, invoices, quotes, refetchAll, loading } =
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

  if (!isAuthenticated || !user) {
    redirect('/')
    return null
  }

  const hasClients = clients && clients.length > 0
  const hasCompanies = companies && companies.length > 0

  // Calculate global stats
  const allInvoices = invoices || []
  const allQuotes = quotes || []

  const totalRevenue = allInvoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + (invoice.total || 0), 0)

  const pendingAmount = allInvoices
    .filter(invoice => invoice.status === 'sent' || invoice.status === 'draft')
    .reduce((sum, invoice) => sum + (invoice.total || 0), 0)

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
      refetchAll()
    } catch (error) {
      console.error(`Error deleting ${deleteDialog.type}:`, error)
    }
  }

  if (loading) {
    return (
      <Main>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
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
            iconGradient="bg-gradient-to-r from-green-400 to-emerald-400"
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
            iconGradient="bg-gradient-to-r from-blue-400 to-indigo-400"
            className="hidden"
          />
          <StatsCard
            title="Quotes"
            value={allQuotes.length.toString()}
            icon="lucide:FileText"
            iconGradient="bg-gradient-to-r from-purple-400 to-pink-400"
            className="hidden"
          />
        </div>
        {/* Quick Actions - Only show when no data exists */}
        {hasCompanies || hasClients || paymentMethods.length > 0 ? null : (
          <div className="flex gap-4 sm:gap-6 mb-6 sm:mb-8">
            {!hasCompanies && (
              <FirstActionCard
                title="Create Company"
                description=" Set up your business profile and billing information"
                setter={setIsCompanyModalOpen}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white "
                descriptionClassName="text-indigo-100"
              />
            )}

            {!hasClients && (
              <FirstActionCard
                title="Create Client"
                description="Add clients to start creating invoices and quotes"
                setter={setIsClientModalOpen}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white "
                descriptionClassName="text-cyan-100"
              />
            )}
            {paymentMethods.length === 0 && (
              <FirstActionCard
                title="Add Payment Method"
                description="Configure how you receive payments from clients"
                setter={setIsClientModalOpen}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white "
                descriptionClassName="text-emerald-100"
              />
            )}
          </div>
        )}
        {/* Clients Section */}
        <DashboardSection
          title="Your Clients"
          description="Click on a client to manage their billing"
          icon="lucide:Users"
          iconGradient="bg-gradient-to-r from-cyan-500 to-blue-500"
          onAdd={() => setIsClientModalOpen(true)}
          addButtonText="Add Client"
          addButtonIcon="lucide:UserPlus"
          addButtonGradient="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          isEmpty={!hasClients}
          emptyState={{
            icon: 'lucide:Users',
            iconBg: 'bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-500',
            title: 'No clients yet',
            description: 'Add your first client to start creating invoices and quotes',
            buttonText: 'Add First Client',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {clients?.map(client => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Companies Section */}
          <DashboardSection
            title="Your Companies"
            description="Manage your business entities"
            icon="lucide:Building2"
            iconGradient="bg-gradient-to-r from-indigo-500 to-purple-500"
            onAdd={() => setIsCompanyModalOpen(true)}
            addButtonText="Add Company"
            addButtonIcon="lucide:Plus"
            addButtonGradient="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            isEmpty={!hasCompanies}
            emptyState={{
              icon: 'lucide:Building2',
              iconBg: 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-500',
              title: 'No companies yet',
              description: 'Create your first company to start professional billing',
              buttonText: 'Create First Company',
            }}
          >
            <div className="grid grid-cols-1  gap-4 sm:gap-6">
              {companies.map(company => (
                <CompanyCard
                  key={company._id}
                  company={company}
                  onEdit={handleEditCompany}
                  onDelete={handleDeleteCompany}
                />
              ))}
            </div>
          </DashboardSection>

          {/* Payment Methods Section */}
          <DashboardSection
            title="Your Payment Methods"
            description="Configure how you receive payments"
            icon="lucide:CreditCard"
            iconGradient="bg-gradient-to-r from-green-500 to-emerald-500"
            onAdd={() => setIsPaymentMethodModalOpen(true)}
            addButtonText="Add Payment Method"
            addButtonIcon="lucide:Plus"
            addButtonGradient="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            isEmpty={paymentMethods.length === 0}
            emptyState={{
              icon: 'lucide:CreditCard',
              iconBg: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-500',
              title: 'No payment methods yet',
              description: 'Add your first payment method to start receiving payments from clients',
              buttonText: 'Add First Payment Method',
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2  gap-4 sm:gap-6">
              {paymentMethods.map(paymentMethod => (
                <PaymentMethodCard
                  key={paymentMethod._id}
                  paymentMethod={paymentMethod}
                  onEdit={handleEditPaymentMethod}
                  onDelete={handleDeletePaymentMethod}
                />
              ))}
            </div>
          </DashboardSection>
        </div>
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

export default DashboardPage
