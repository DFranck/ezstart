'use client'

import { ClientModal } from '@/components/client-modal'
import { CompanyModal } from '@/components/company-modal'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { useBillingContext } from '@/contexts/billing-context'
import { useUserStore } from '@/stores/useUserStore'
import { Client, Company } from '@ez-billing/types'
import { Button, H1, H2, H3, Icon, P, Section } from '@ezstart/ui/components'
import { callApi } from '@ezstart/ui/utils'
import { redirect, useRouter } from 'next/navigation'
import { useState } from 'react'
import ClientCard from './components/client-card'

const DashboardPage = () => {
  const router = useRouter()
  const { user } = useUserStore()
  const { clients, companies, refetchAll, loading } = useBillingContext()
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    type: 'company' | 'client'
    item: Company | Client | null
  }>({ isOpen: false, type: 'client', item: null })

  if (!user) {
    redirect('/')
    return null
  }

  const isClients = clients && clients.length > 0
  const hasCompanies = companies && companies.length > 0

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

  const confirmDelete = async () => {
    if (!deleteDialog.item) return
    
    try {
      if (deleteDialog.type === 'company') {
        await callApi(`/companies/${deleteDialog.item._id}`, { method: 'DELETE' })
      } else {
        await callApi(`/clients/${deleteDialog.item._id}`, { method: 'DELETE' })
      }
      refetchAll()
    } catch (error) {
      console.error(`Error deleting ${deleteDialog.type}:`, error)
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
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header with glass effect */}
      <div className="backdrop-blur-sm bg-white/70 border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.name}</p>
            </div>
            
            {/* Stats Preview */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Icon name="lucide:Building2" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{companies?.length || 0}</p>
                    <p className="text-sm text-gray-500">Companies</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Icon name="lucide:Users" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{clients?.length || 0}</p>
                    <p className="text-sm text-gray-500">Clients</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer transform hover:scale-105 transition-all duration-300"
               onClick={() => setIsCompanyModalOpen(true)}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Icon name="lucide:Building2" className="w-8 h-8" />
                <Icon name="lucide:ArrowRight" className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">Create Company</h3>
              <p className="text-indigo-100 text-sm">Set up your business profile and billing information</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer transform hover:scale-105 transition-all duration-300"
               onClick={() => setIsClientModalOpen(true)}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Icon name="lucide:UserPlus" className="w-8 h-8" />
                <Icon name="lucide:ArrowRight" className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">Add New Client</h3>
              <p className="text-cyan-100 text-sm">Add clients to start creating invoices and quotes</p>
            </div>
          </div>
        </div>

        {/* Companies Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:Building2" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your Companies</h2>
                  <p className="text-sm text-gray-500">Manage your business entities</p>
                </div>
              </div>
              <Button
                onClick={() => setIsCompanyModalOpen(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </div>
          </div>

          <div className="p-6">
            {hasCompanies ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map(company => (
                  <div key={company._id} className="group relative">
                    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 rounded-xl p-6 hover:shadow-xl cursor-pointer transition-all duration-300 hover:border-indigo-200 group-hover:-translate-y-1"
                         onClick={() => handleEditCompany(company)}>
                      
                      {/* Company Icon */}
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center mb-4">
                        <Icon name="lucide:Building2" className="w-6 h-6 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
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
                <p className="text-gray-500 mb-6">Create your first company to start professional billing</p>
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

        {/* Clients Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:Users" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your Clients</h2>
                  <p className="text-sm text-gray-500">Click on a client to manage their billing</p>
                </div>
              </div>
              <Button
                onClick={() => setIsClientModalOpen(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Icon name="lucide:UserPlus" className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>

          <div className="p-6">
            {isClients ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clients?.map(client => (
                  <div key={client._id} className="group relative">
                    <div 
                      onClick={() => handleClientClick(client)} 
                      className="bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 rounded-xl p-6 hover:shadow-xl cursor-pointer transition-all duration-300 hover:border-cyan-200 group-hover:-translate-y-1"
                    >
                      {/* Client Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center mb-4">
                        <Icon name={client.isCompany ? "lucide:Building" : "lucide:User"} className="w-6 h-6 text-white" />
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                        {client.clientName}
                      </h3>
                      <p className="text-gray-600 text-sm mb-1 line-clamp-1">{client.email}</p>
                      <p className="text-gray-500 text-sm line-clamp-1">
                        {client.city}, {client.country}
                      </p>
                      
                      {/* Client Type Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          client.isCompany 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
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
                <p className="text-gray-500 mb-6">Add your first client to start creating invoices and quotes</p>
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

      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, type: 'client', item: null })}
        onConfirm={confirmDelete}
        title={`Delete ${deleteDialog.type === 'company' ? 'Company' : 'Client'}`}
        description={`Are you sure you want to delete "${
          deleteDialog.item ? 
            (deleteDialog.type === 'company' ? (deleteDialog.item as Company).companyName : (deleteDialog.item as Client).clientName) 
            : ''
        }"? This can be undone from Settings.`}
      />
    </div>
  )
}

export default DashboardPage