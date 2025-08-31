'use client'

import { ClientModal } from '@/components/client-modal'
import { CompanyModal } from '@/components/company-modal'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { useBillingContext } from '@/contexts/billing-context'
import { useUserStore } from '@/stores/useUserStore'
import { Client, Company } from '@ez-billing/types'
import { Button, H1, H2, H3, Icon, P, Section } from '@ezstart/ui/components'
import { callBillingApi } from '../utils/call-billing-api'
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
        await callBillingApi(`/companies/${deleteDialog.item._id}`, { method: 'DELETE' })
      } else {
        await callBillingApi(`/clients/${deleteDialog.item._id}`, { method: 'DELETE' })
      }
      refetchAll()
    } catch (error) {
      console.error(`Error deleting ${deleteDialog.type}:`, error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 bg-gray-800 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-4 h-4 bg-gray-800 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-4 h-4 bg-gray-800 rounded-full animate-bounce"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back, {user.name}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setIsCompanyModalOpen(true)}
                variant="outline"
                className="text-sm font-medium"
              >
                <Icon name="lucide:Building2" className="w-4 h-4 mr-2" />
                Add Company
              </Button>
              <Button
                onClick={() => setIsClientModalOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium"
              >
                <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon name="lucide:Building2" className="w-4 h-4 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-xl font-semibold text-gray-900">{companies?.length || 0}</p>
                <p className="text-sm text-gray-500">Companies</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon name="lucide:Users" className="w-4 h-4 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-xl font-semibold text-gray-900">{clients?.length || 0}</p>
                <p className="text-sm text-gray-500">Clients</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon name="lucide:FileEdit" className="w-4 h-4 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-xl font-semibold text-gray-900">0</p>
                <p className="text-sm text-gray-500">Invoices</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon name="lucide:FileText" className="w-4 h-4 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-xl font-semibold text-gray-900">0</p>
                <p className="text-sm text-gray-500">Quotes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Companies Section */}
        <div className="bg-white rounded-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Companies</h2>
              <Button
                onClick={() => setIsCompanyModalOpen(true)}
                size="sm"
                variant="outline"
                className="text-sm"
              >
                <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          <div className="p-6">
            {hasCompanies ? (
              <div className="grid gap-4">
                {companies.map(company => (
                  <div key={company._id} 
                       className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors group cursor-pointer"
                       onClick={() => handleEditCompany(company)}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon name="lucide:Building2" className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{company.companyName}</h3>
                        <p className="text-sm text-gray-500">{company.email}</p>
                      </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          handleEditCompany(company)
                        }}
                      >
                        <Icon name="lucide:Edit" className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteCompany(company)
                        }}
                      >
                        <Icon name="lucide:Trash2" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Icon name="lucide:Building2" className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No companies</h3>
                <p className="text-sm text-gray-500">Create your first company to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Clients Section */}
        <div className="bg-white rounded-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Clients</h2>
              <Button
                onClick={() => setIsClientModalOpen(true)}
                size="sm"
                variant="outline"
                className="text-sm"
              >
                <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          <div className="p-6">
            {isClients ? (
              <div className="grid gap-4">
                {clients?.map(client => (
                  <div key={client._id}
                       className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors group cursor-pointer"
                       onClick={() => handleClientClick(client)}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon name={client.isCompany ? "lucide:Building" : "lucide:User"} className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{client.clientName}</h3>
                        <p className="text-sm text-gray-500">{client.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        client.isCompany 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {client.isCompany ? 'Company' : 'Individual'}
                      </span>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={e => {
                            e.stopPropagation()
                            handleEditClient(client)
                          }}
                        >
                          <Icon name="lucide:Edit" className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteClient(client)
                          }}
                        >
                          <Icon name="lucide:Trash2" className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Icon name="lucide:Users" className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No clients</h3>
                <p className="text-sm text-gray-500">Add your first client to start billing</p>
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