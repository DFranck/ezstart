// /app/(views)/billing/clients/[clientId]/page.tsx
// Path comment ↑ as per your convention.

'use client'

import { ClientHeader } from '@/components/ClientHeader'
import { ClientStats } from '@/components/ClientStats'
import DashboardSection from '@/components/DashboardSection'
import { InvoiceCard, QuoteCard, ReceiptCard } from '@/components/DocumentCard'
import { InvoiceModal } from '@/components/invoice-modal'
import { MarkPaidModal } from '@/components/mark-paid-modal'
import { PreviewPdfModal, type PreviewState } from '@/components/PreviewPdfModal'
import { QuoteModal } from '@/components/quote-modal'
import { useBillingContext } from '@/contexts/billing-context'
import { useClientDashboardHandlers } from '@/hooks/useClientDashboardHandlers'
import { getBillingPermissions } from '@/utils/billing-permissions'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import { useAuth } from '@ezstart/auth-sdk'
import { Icon, P } from '@ezstart/ui/components'
import { redirect, useParams } from 'next/navigation'
import React, { useState } from 'react'

const ClientDashboardPage = () => {
  const params = useParams()
  const clientId = params.clientId as string

  const { user, isAuthenticated } = useAuth()
  const { clients, invoices, quotes, receipts, companies, refetchAll, paymentMethods, loading } =
    useBillingContext()

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined)
  const [editingQuote, setEditingQuote] = useState<Quote | undefined>(undefined)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined)
  const [preview, setPreview] = useState<PreviewState>({ isOpen: false })

  // Use the custom hook for all document handlers
  const handlers = useClientDashboardHandlers()

  if (!user || !isAuthenticated) {
    redirect('/')
    return null
  }

  const client = clients.find((c: Client) => c._id === clientId)

  if (!loading && !client) {
    redirect('/dashboard')
    return null
  }

  const clientInvoices = invoices.filter((invoice: Invoice) => invoice.clientId === clientId)
  const clientQuotes = quotes.filter((quote: Quote) => quote.clientId === clientId)
  const clientReceipts = receipts.filter((receipt: Receipt) => receipt.clientId === clientId)

  const totalRevenue = clientInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)
  const pendingAmount = clientInvoices
    .filter(inv => inv.status === 'sent')
    .reduce((sum, inv) => sum + inv.total, 0)

  const handleCreateInvoice = () => {
    setEditingInvoice(undefined)
    setIsInvoiceModalOpen(true)
  }

  const handleCreateQuote = () => {
    setEditingQuote(undefined)
    setIsQuoteModalOpen(true)
  }

  const handleEditInvoice = (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingInvoice(invoice)
    setIsInvoiceModalOpen(true)
  }

  const handleEditQuote = (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingQuote(quote)
    setIsQuoteModalOpen(true)
  }

  const handleMarkPaid = (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedInvoice(invoice)
    setIsMarkPaidModalOpen(true)
  }

  const handleConvertToInvoice = (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const invoiceData = handlers.handleConvertToInvoice(quote)
    setEditingInvoice(invoiceData as any)
    setIsInvoiceModalOpen(true)
  }

  const openPreview = (kind: 'invoice' | 'quote' | 'receipt', doc: any) => {
    setPreview({ isOpen: true, kind, doc })
  }

  const closePreview = () => setPreview({ isOpen: false })

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center w-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <P className="text-foreground/60 font-medium">Loading client dashboard...</P>
        </div>
      </div>
    )
  }

  if (!client) return null

  return (
    <>
      {/* Header */}
      <ClientHeader
        client={client}
        onCreateQuote={handleCreateQuote}
        onCreateInvoice={handleCreateInvoice}
      />

      {/* Body */}
      <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 pb-6 w-full">
        {/* Stats */}
        <ClientStats
          totalRevenue={totalRevenue}
          pendingAmount={pendingAmount}
          invoicesCount={clientInvoices.length}
          quotesCount={clientQuotes.length}
        />

        {/* Invoices */}
        <DashboardSection
          title="Invoices"
          description={`${clientInvoices.length} total invoices`}
          icon="lucide:FileEdit"
          iconGradient="bg-gradient-to-r from-blue-500 to-indigo-500"
          onAdd={handleCreateInvoice}
          addButtonText="Create Invoice"
          addButtonIcon="lucide:Plus"
          addButtonGradient="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          isEmpty={clientInvoices.length === 0}
          emptyState={{
            icon: 'lucide:FileEdit',
            iconBg: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-500',
            title: 'No invoices yet',
            description: 'Create your first invoice to get started',
            buttonText: 'Create First Invoice',
          }}
        >
          {clientInvoices.length > 0 && (
            <div className="space-y-4">
              {clientInvoices.map(invoice => {
                const permissions = getBillingPermissions(invoice, 'invoice')
                return (
                  <InvoiceCard
                    key={invoice._id}
                    documentNumber={invoice.documentNumber}
                    status={invoice.status}
                    createdAt={invoice.createdAt}
                    total={invoice.total}
                    currency={invoice.currency}
                    permissions={permissions}
                    onClick={() => openPreview('invoice', invoice)}
                    onEdit={e => handleEditInvoice(invoice, e)}
                    onSend={e => handlers.handleSendInvoice(invoice, e)}
                    onDownload={e => handlers.handleDownloadInvoice(invoice, e)}
                    onDownloadReceipt={e => handlers.handleDownloadReceiptByInvoice(invoice, e)}
                    onMarkPaid={e => handleMarkPaid(invoice, e)}
                  />
                )
              })}
            </div>
          )}
        </DashboardSection>

        {/* Quotes */}
        <DashboardSection
          title="Quotes"
          description={`${clientQuotes.length} total quotes`}
          icon="lucide:FileText"
          iconGradient="bg-gradient-to-r from-green-500 to-emerald-500"
          onAdd={handleCreateQuote}
          addButtonText="Create Quote"
          addButtonIcon="lucide:Plus"
          addButtonGradient="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          isEmpty={clientQuotes.length === 0}
          emptyState={{
            icon: 'lucide:FileText',
            iconBg: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-500',
            title: 'No quotes yet',
            description: 'Create your first quote to get started',
            buttonText: 'Create First Quote',
          }}
        >
          {clientQuotes.length > 0 && (
            <div className="space-y-4">
              {clientQuotes.map(quote => {
                const permissions = getBillingPermissions(quote, 'quote')
                return (
                  <QuoteCard
                    key={quote._id}
                    documentNumber={quote.documentNumber}
                    status={quote.status}
                    createdAt={quote.createdAt}
                    total={quote.total}
                    currency={quote.currency}
                    validUntil={quote.validUntil}
                    permissions={permissions}
                    onClick={() => openPreview('quote', quote)}
                    onEdit={e => handleEditQuote(quote, e)}
                    onSend={e => handlers.handleSendQuote(quote, e)}
                    onAccept={e => handlers.handleAcceptQuote(quote, e)}
                    onDecline={e => handlers.handleDeclineQuote(quote, e)}
                    onDownload={e => handlers.handleDownloadQuote(quote, e)}
                    onConvertToInvoice={e => handleConvertToInvoice(quote, e)}
                  />
                )
              })}
            </div>
          )}
        </DashboardSection>

        {/* Receipts */}
        <DashboardSection
          title="Receipts"
          description={`${clientReceipts.length} total receipts`}
          icon="lucide:Receipt"
          iconGradient="bg-gradient-to-r from-purple-500 to-pink-500"
          onAdd={() => {}}
          addButtonText=""
          addButtonIcon="lucide:Plus"
          addButtonGradient="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hidden"
          isEmpty={clientReceipts.length === 0}
          emptyState={{
            icon: 'lucide:Receipt',
            iconBg: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-500',
            title: 'No receipts yet',
            description: 'Receipts are generated automatically when invoices are paid',
            buttonText: '',
          }}
          className="mb-0"
        >
          {clientReceipts.length > 0 && (
            <div className="space-y-4">
              {clientReceipts.map(receipt => (
                <ReceiptCard
                  key={receipt._id}
                  documentNumber={receipt.documentNumber}
                  status={receipt.status}
                  createdAt={receipt.createdAt}
                  total={receipt.total}
                  currency={receipt.currency}
                  paymentDate={receipt.paymentDate}
                  onClick={() => openPreview('receipt', receipt)}
                  onDownload={e => handlers.handleDownloadReceipt(receipt, e)}
                />
              ))}
            </div>
          )}
        </DashboardSection>
      </div>

      {/* CRUD Modals */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={editingInvoice}
        clients={clients}
        companies={companies}
        paymentMethods={paymentMethods}
        onSave={refetchAll}
      />

      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        quote={editingQuote}
        clients={clients}
        companies={companies}
        onSave={refetchAll}
      />

      {selectedInvoice && (
        <MarkPaidModal
          isOpen={isMarkPaidModalOpen}
          onClose={() => setIsMarkPaidModalOpen(false)}
          invoice={selectedInvoice}
          companies={companies}
          onSave={refetchAll}
        />
      )}

      {/* PDF Preview Modal */}
      <PreviewPdfModal
        isOpen={preview.isOpen}
        kind={preview.kind}
        doc={preview.doc}
        onClose={closePreview}
      />
    </>
  )
}

export default ClientDashboardPage
