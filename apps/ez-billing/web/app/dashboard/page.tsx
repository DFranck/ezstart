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
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
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

  if (loading) return <div>Loading...</div>

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <H1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</H1>
        <P className="text-gray-600">Manage your billing operations</P>
      </div>

      <Section className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <H2 className="text-xl font-semibold text-gray-900">Your Companies</H2>
          <Button
            onClick={() => setIsCompanyModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm w-fit"
          >
            Create Company
          </Button>
        </div>

        {hasCompanies ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map(company => (
              <div key={company._id} className="relative group">
                <div
                  className="p-6 bg-gradient-to-br from-green-50 to-blue-50 border border-gray-200 rounded-xl hover:shadow-lg cursor-pointer transition-all duration-200 hover:scale-105"
                  onClick={() => handleEditCompany(company)}
                >
                  <H3 className="text-lg font-semibold text-gray-900 mb-2">
                    {company.companyName}
                  </H3>
                  <P className="text-gray-600 text-sm mb-1">{company.email}</P>
                  <P className="text-gray-500 text-sm">
                    {company.city}, {company.country}
                  </P>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white shadow-sm border border-gray-300 hover:bg-gray-50"
                    onClick={e => {
                      e.stopPropagation()
                      handleEditCompany(company)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white shadow-sm border border-red-300 text-red-600 hover:bg-red-50"
                    onClick={e => {
                      e.stopPropagation()
                      handleDeleteCompany(company)
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="lucide:Building2" className="w-8 h-8 text-gray-400" />
            </div>
            <P className="text-gray-500 mb-2">No companies yet</P>
            <P className="text-gray-400 text-sm">Create your first company to start billing</P>
          </div>
        )}
      </Section>

      <Section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <H2 className="text-xl font-semibold text-gray-900">Your Clients</H2>
          <Button
            onClick={() => setIsClientModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Icon name="fa:FaPlus" className="mr-2" />
            New Client
          </Button>
        </div>

        {isClients ? (
          <>
            <P className="text-gray-600 mb-6">
              Click on a client to manage their invoices, quotes and receipts
            </P>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clients?.map(client => (
                <div key={client._id} className="relative group">
                  <div onClick={() => handleClientClick(client)} className="cursor-pointer">
                    <ClientCard client={client} />
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white shadow-sm border border-gray-300 hover:bg-gray-50"
                      onClick={e => {
                        e.stopPropagation()
                        handleEditClient(client)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white shadow-sm border border-red-300 text-red-600 hover:bg-red-50"
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteClient(client)
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="lucide:Users" className="w-8 h-8 text-gray-400" />
            </div>
            <P className="text-gray-500 mb-2">No clients yet</P>
            <P className="text-gray-400 text-sm">Create your first client to start billing</P>
          </div>
        )}
      </Section>

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
