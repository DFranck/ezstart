'use client'

import { ClientModal } from '@/components/client-modal'
import { CompanyModal } from '@/components/company-modal'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { PaymentMethodModal } from '@/components/payment-method-modal'
import { useBillingContext } from '@/contexts/billing-context'
import { getUserId } from '@/utils/get-user-id'
import { Client, Company, PaymentMethod } from '@ez-billing/types'
import { useAuth } from '@ezstart/auth-sdk'
import { Button, Icon, Main } from '@ezstart/ui/components'
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

  const isClients = clients && clients.length > 0
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Quick Actions - Only show when no data exists */}
        {hasCompanies && isClients && !paymentMethods.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group cursor-pointer transform hover:scale-105 transition-all duration-300"
              onClick={() => setIsCompanyModalOpen(true)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <Icon name="lucide:Building2" className="w-8 h-8" />
                  <Icon
                    name="lucide:ArrowRight"
                    className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Create Company</h3>
                <p className="text-indigo-100 text-sm">
                  Set up your business profile and billing information
                </p>
              </div>
            </div>

            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group cursor-pointer transform hover:scale-105 transition-all duration-300"
              onClick={() => setIsClientModalOpen(true)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <Icon name="lucide:UserPlus" className="w-8 h-8" />
                  <Icon
                    name="lucide:ArrowRight"
                    className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Add New Client</h3>
                <p className="text-cyan-100 text-sm">
                  Add clients to start creating invoices and quotes
                </p>
              </div>
            </div>

            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group cursor-pointer transform hover:scale-105 transition-all duration-300"
              onClick={() => setIsPaymentMethodModalOpen(true)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <Icon name="lucide:CreditCard" className="w-8 h-8" />
                  <Icon
                    name="lucide:ArrowRight"
                    className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform"
                  />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Add Payment Method</h3>
                <p className="text-emerald-100 text-sm">
                  Configure how you receive payments from clients
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Section - Only show when there's data */}
        {(isClients || hasCompanies || allInvoices.length > 0 || allQuotes.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:DollarSign" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    ${totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">Total Revenue</p>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:Clock" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    ${pendingAmount.toFixed(2)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">Pending</p>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:FileEdit" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {allInvoices.length}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">Invoices</p>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:FileText" className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {allQuotes.length}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">Quotes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clients Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:Users" className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Clients</h2>
                  <p className="text-sm text-gray-500">Click on a client to manage their billing</p>
                </div>
              </div>
              <Button
                onClick={() => setIsClientModalOpen(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium px-3 py-2 sm:px-6 sm:py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Icon name="lucide:UserPlus" className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Client</span>
              </Button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isClients ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {clients?.map(client => (
                  <div key={client._id} className="group relative">
                    <div
                      onClick={() => handleClientClick(client)}
                      className="bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 rounded-xl p-4 sm:p-6 hover:shadow-xl cursor-pointer transition-all duration-300 hover:border-cyan-200 group-hover:-translate-y-1"
                    >
                      {/* Client Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center mb-4">
                        <Icon
                          name={client.isCompany ? 'lucide:Building' : 'lucide:User'}
                          className="w-6 h-6 text-white"
                        />
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                        {client.clientName}
                      </h3>
                      <p className="text-gray-600 text-sm mb-1 line-clamp-1">{client.email}</p>
                      <p className="text-gray-500 text-sm line-clamp-1">
                        {client.city}, {client.country}
                      </p>

                      {/* Client Type Badge */}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            client.isCompany
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {client.isCompany ? 'Company' : 'Individual'}
                        </span>
                      </div>

                      {/* Floating Actions */}
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/90 backdrop-blur-sm shadow-lg border-0 hover:bg-white"
                          onClick={e => {
                            e.stopPropagation()
                            handleEditClient(client)
                          }}
                        >
                          <Icon name="lucide:Edit" className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/90 backdrop-blur-sm shadow-lg border-0 text-red-600 hover:bg-red-50"
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteClient(client)
                          }}
                        >
                          <Icon name="lucide:Trash2" className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon name="lucide:Users" className="w-10 h-10 text-cyan-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients yet</h3>
                <p className="text-gray-500 mb-6">
                  Add your first client to start creating invoices and quotes
                </p>
                <Button
                  onClick={() => setIsClientModalOpen(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium px-6 py-3 rounded-xl"
                >
                  <Icon name="lucide:UserPlus" className="w-4 h-4 mr-2" />
                  Add First Client
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Companies Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Icon name="lucide:Building2" className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Companies</h2>
                    <p className="text-sm text-gray-500">Manage your business entities</p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsCompanyModalOpen(true)}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium px-3 py-2 sm:px-6 sm:py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Icon name="lucide:Plus" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Company</span>
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {hasCompanies ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {companies.map(company => (
                    <div key={company._id} className="group relative">
                      <div
                        className="bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 rounded-xl p-4 sm:p-6 hover:shadow-xl cursor-pointer transition-all duration-300 hover:border-indigo-200 group-hover:-translate-y-1"
                        onClick={() => handleEditCompany(company)}
                      >
                        {/* Company Icon */}
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center mb-4">
                          <Icon name="lucide:Building2" className="w-6 h-6 text-white" />
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                          {company.companyName}
                        </h3>
                        <p className="text-gray-600 text-sm mb-1 line-clamp-1">{company.email}</p>
                        <p className="text-gray-500 text-sm line-clamp-1">
                          {company.city}, {company.country}
                        </p>

                        {/* Floating Actions */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/90 backdrop-blur-sm shadow-lg border-0 hover:bg-white"
                            onClick={e => {
                              e.stopPropagation()
                              handleEditCompany(company)
                            }}
                          >
                            <Icon name="lucide:Edit" className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/90 backdrop-blur-sm shadow-lg border-0 text-red-600 hover:bg-red-50"
                            onClick={e => {
                              e.stopPropagation()
                              handleDeleteCompany(company)
                            }}
                          >
                            <Icon name="lucide:Trash2" className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Icon name="lucide:Building2" className="w-10 h-10 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No companies yet</h3>
                  <p className="text-gray-500 mb-6">
                    Create your first company to start professional billing
                  </p>
                  <Button
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium px-6 py-3 rounded-xl"
                  >
                    <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
                    Create First Company
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Icon name="lucide:CreditCard" className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                      Your Payment Methods
                    </h2>
                    <p className="text-sm text-gray-500">Configure how you receive payments</p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsPaymentMethodModalOpen(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium px-3 py-2 sm:px-6 sm:py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Icon name="lucide:Plus" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Payment Method</span>
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {paymentMethods.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {paymentMethods.map(paymentMethod => (
                    <div key={paymentMethod._id} className="group relative">
                      <div
                        className="bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 rounded-xl p-4 sm:p-6 hover:shadow-xl cursor-pointer transition-all duration-300 hover:border-green-200 group-hover:-translate-y-1"
                        onClick={() => handleEditPaymentMethod(paymentMethod)}
                      >
                        {/* Payment Method Icon */}
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center mb-4">
                          <Icon
                            name={
                              paymentMethod.type === 'crypto_wallet'
                                ? 'lucide:Wallet'
                                : paymentMethod.type === 'bank_transfer'
                                  ? 'lucide:Building'
                                  : 'lucide:CreditCard'
                            }
                            className="w-6 h-6 text-white"
                          />
                        </div>

                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
                            {paymentMethod.name}
                          </h3>
                          {paymentMethod.isDefault && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              Default
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 text-sm mb-1 capitalize">
                          {paymentMethod.type.replace('_', ' ')}
                        </p>

                        {paymentMethod.type === 'crypto_wallet' && (
                          <p className="text-gray-500 text-sm line-clamp-1 font-mono">
                            {paymentMethod.currency} • {paymentMethod.network}
                          </p>
                        )}

                        {paymentMethod.type === 'bank_transfer' && (
                          <p className="text-gray-500 text-sm line-clamp-1">
                            {paymentMethod.bankName}
                          </p>
                        )}

                        {['paypal', 'wise', 'revolut'].includes(paymentMethod.type) && (
                          <p className="text-gray-500 text-sm line-clamp-1">
                            {paymentMethod.email}
                          </p>
                        )}

                        {/* Floating Actions */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/90 backdrop-blur-sm shadow-lg border-0 hover:bg-white"
                            onClick={e => {
                              e.stopPropagation()
                              handleEditPaymentMethod(paymentMethod)
                            }}
                          >
                            <Icon name="lucide:Edit" className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/90 backdrop-blur-sm shadow-lg border-0 text-red-600 hover:bg-red-50"
                            onClick={e => {
                              e.stopPropagation()
                              handleDeletePaymentMethod(paymentMethod)
                            }}
                          >
                            <Icon name="lucide:Trash2" className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Icon name="lucide:CreditCard" className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No payment methods yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Add your first payment method to start receiving payments from clients
                  </p>
                  <Button
                    onClick={() => setIsPaymentMethodModalOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium px-6 py-3 rounded-xl"
                  >
                    <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
                    Add First Payment Method
                  </Button>
                </div>
              )}
            </div>
          </div>
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
