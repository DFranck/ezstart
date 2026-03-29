// /app/(views)/billing/clients/[clientId]/page.tsx
// Path comment ↑ as per your convention.

'use client'

import { ClientHeader } from '@/components/ClientHeader'
import { ClientStats } from '@/components/ClientStats'
import CollapsibleGroup from '@/components/CollapsibleGroup'
import DashboardSection from '@/components/DashboardSection'
import { InvoiceCard, QuoteCard, ReceiptCard } from '@/components/DocumentCard'
import { useBillingContext } from '@/contexts/billing-context'
import { useClientDashboardHandlers } from '@/hooks/useClientDashboardHandlers'
import { getBillingPermissions } from '@/utils/billing-permissions'
import {
  groupInvoicesByMonth,
  groupInvoicesByStatus,
  groupInvoicesByWeek,
} from '@/utils/group-invoices'
import { groupQuotesByMonth, groupQuotesByStatus } from '@/utils/group-quotes'
import { groupReceiptsByMonth } from '@/utils/group-receipts'
import { Client, Invoice, Quote, Receipt } from '@ezbill/types'
import { useAuth } from '@ezstart/auth-sdk'
import { Button, Icon, Skeleton, SkeletonCard, Div } from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import { redirect, useParams } from 'next/navigation'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

// Dynamic imports for modals (lazy load on demand) - Performance optimization
const InvoiceModal = dynamic(
  () => import('@/components/invoice-modal').then(mod => ({ default: mod.InvoiceModal })),
  {
    loading: () => null,
    ssr: false,
  }
)

const QuoteModal = dynamic(
  () => import('@/components/quote-modal').then(mod => ({ default: mod.QuoteModal })),
  {
    loading: () => null,
    ssr: false,
  }
)

const MarkPaidModal = dynamic(
  () => import('@/components/mark-paid-modal').then(mod => ({ default: mod.MarkPaidModal })),
  {
    loading: () => null,
    ssr: false,
  }
)

const PreviewPdfModal = dynamic(
  () => import('@/components/PreviewPdfModal').then(mod => ({ default: mod.PreviewPdfModal })),
  {
    loading: () => null,
    ssr: false,
  }
)

const ShareModal = dynamic(
  () => import('@/components/share-modal').then(mod => ({ default: mod.ShareModal })),
  {
    loading: () => null,
    ssr: false,
  }
)

// Type import for PreviewState
type PreviewState = {
  isOpen: boolean
  kind?: 'invoice' | 'quote' | 'receipt'
  doc?: any
}

type ShareState = {
  isOpen: boolean
  type: 'invoice' | 'quote'
  document?: Invoice | Quote
  pdfUrl?: string
}

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
  const [invoiceGroupBy, setInvoiceGroupBy] = useState<'month' | 'week' | 'status'>('month')
  const [quoteGroupBy, setQuoteGroupBy] = useState<'month' | 'status'>('month')
  const [shareState, setShareState] = useState<ShareState>({ isOpen: false, type: 'invoice' })

  // Use the custom hook for all document handlers
  const handlers = useClientDashboardHandlers()
  const tToast = useTranslations('toast')
  const tDashboard = useTranslations('dashboard')

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

  const handleSendInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const pdfUrl = await handlers.generateInvoicePdfUrl(invoice)
    if (pdfUrl) {
      setShareState({ isOpen: true, type: 'invoice', document: invoice, pdfUrl })
    } else {
      toast.error(tToast('pdfGenerateFailed'))
    }
  }

  const handleSendQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const pdfUrl = await handlers.generateQuotePdfUrl(quote)
    if (pdfUrl) {
      setShareState({ isOpen: true, type: 'quote', document: quote, pdfUrl })
    } else {
      toast.error(tToast('quotePdfNotReady'))
    }
  }

  const handleMarkAsSent = async () => {
    if (!shareState.document) return

    const success =
      shareState.type === 'invoice'
        ? await handlers.markInvoiceAsSent(shareState.document as Invoice)
        : await handlers.markQuoteAsSent(shareState.document as Quote)

    if (success) {
      // Cleanup PDF URL
      if (shareState.pdfUrl) {
        URL.revokeObjectURL(shareState.pdfUrl)
      }
      setShareState({ isOpen: false, type: 'invoice' })
    }
  }

  const handleCloseShareModal = () => {
    // Cleanup PDF URL
    if (shareState.pdfUrl) {
      URL.revokeObjectURL(shareState.pdfUrl)
    }
    setShareState({ isOpen: false, type: 'invoice' })
  }

  // Group invoices based on selected grouping
  const invoiceGroups = useMemo(() => {
    if (invoiceGroupBy === 'month') return groupInvoicesByMonth(clientInvoices, 'fr')
    if (invoiceGroupBy === 'week') return groupInvoicesByWeek(clientInvoices, 'fr')
    return groupInvoicesByStatus(clientInvoices)
  }, [clientInvoices, invoiceGroupBy])

  // Group quotes based on selected grouping
  const quoteGroups = useMemo(() => {
    if (quoteGroupBy === 'month') return groupQuotesByMonth(clientQuotes, 'fr')
    return groupQuotesByStatus(clientQuotes)
  }, [clientQuotes, quoteGroupBy])

  // Group receipts by month
  const receiptGroups = useMemo(() => {
    return groupReceiptsByMonth(clientReceipts, 'fr')
  }, [clientReceipts])

  if (loading) {
    return (
      <Div className="w-full">
        {/* Header Skeleton */}
        <Div className="bg-card border-b border-border py-6 px-4">
          <Div className="max-w-7xl mx-auto space-y-4">
            <Skeleton className="h-10 w-64" variant="shimmer" />
            <Skeleton className="h-4 w-48" variant="shimmer" />
            <Div className="flex gap-2">
              <Skeleton className="h-10 w-32" variant="shimmer" />
              <Skeleton className="h-10 w-32" variant="shimmer" />
            </Div>
          </Div>
        </Div>

        {/* Body Skeleton */}
        <Div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 pb-6 w-full space-y-6 pt-6">
          {/* Stats Cards */}
          <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" variant="shimmer" />
            ))}
          </Div>

          {/* Invoices Section */}
          <Div className="space-y-4">
            <Skeleton className="h-8 w-48" variant="shimmer" />
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} showHeader showFooter={false} lines={2} variant="shimmer" />
            ))}
          </Div>
        </Div>
      </Div>
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
      <Div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 pb-6 w-full space-y-6">
        {/* Stats */}
        <ClientStats
          totalRevenue={totalRevenue}
          pendingAmount={pendingAmount}
          invoicesCount={clientInvoices.length}
          quotesCount={clientQuotes.length}
        />

        {/* Invoices with Grouping */}
        <DashboardSection
          title={tDashboard('invoices')}
          description={tDashboard('totalInvoicesCount', { count: clientInvoices.length })}
          icon="lucide:FileEdit"
          iconGradient="bg-gradient-invoice"
          onAdd={handleCreateInvoice}
          addButtonText={tDashboard('newInvoice')}
          addButtonIcon="lucide:Plus"
          addButtonGradient="bg-gradient-invoice hover:bg-gradient-invoice-hover"
          isEmpty={clientInvoices.length === 0}
          emptyState={{
            icon: 'lucide:FileEdit',
            iconBg: 'bg-gradient-invoice-light text-ezbill-invoice',
            title: tDashboard('noInvoicesYet'),
            description: tDashboard('noInvoicesDesc'),
            buttonText: tDashboard('createFirstInvoice'),
          }}
        >
          {clientInvoices.length > 0 && (
            <Div className="space-y-4">
              {/* Group By Selector - Only show if 3+ invoices */}
              {clientInvoices.length >= 3 && (
                <Div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={invoiceGroupBy === 'month' ? 'default' : 'outline'}
                    onClick={() => setInvoiceGroupBy('month')}
                  >
                    <Icon name="lucide:Calendar" className="w-4 h-4 mr-2" />
                    {tDashboard('byMonth')}
                  </Button>
                  <Button
                    size="sm"
                    variant={invoiceGroupBy === 'week' ? 'default' : 'outline'}
                    onClick={() => setInvoiceGroupBy('week')}
                  >
                    <Icon name="lucide:CalendarDays" className="w-4 h-4 mr-2" />
                    {tDashboard('byWeek')}
                  </Button>
                  <Button
                    size="sm"
                    variant={invoiceGroupBy === 'status' ? 'default' : 'outline'}
                    onClick={() => setInvoiceGroupBy('status')}
                  >
                    <Icon name="lucide:Tag" className="w-4 h-4 mr-2" />
                    {tDashboard('byStatus')}
                  </Button>
                </Div>
              )}

              {/* Collapsible Groups - Only if 3+ invoices, otherwise flat list */}
              {clientInvoices.length >= 3 ? (
                <CollapsibleGroup
                  groups={invoiceGroups}
                  renderItem={invoice => {
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
                        onSend={e => handleSendInvoice(invoice, e)}
                        onDownload={e => handlers.handleDownloadInvoice(invoice, e)}
                        onDownloadReceipt={e => handlers.handleDownloadReceiptByInvoice(invoice, e)}
                        onMarkPaid={e => handleMarkPaid(invoice, e)}
                      />
                    )
                  }}
                  defaultOpenAll={false}
                  showToggleAll={invoiceGroups.length > 2}
                />
              ) : (
                // Flat list for < 3 invoices
                clientInvoices.map(invoice => {
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
                      onSend={e => handleSendInvoice(invoice, e)}
                      onDownload={e => handlers.handleDownloadInvoice(invoice, e)}
                      onDownloadReceipt={e => handlers.handleDownloadReceiptByInvoice(invoice, e)}
                      onMarkPaid={e => handleMarkPaid(invoice, e)}
                    />
                  )
                })
              )}
            </Div>
          )}
        </DashboardSection>

        {/* Quotes with Grouping */}
        <DashboardSection
          title={tDashboard('quotes')}
          description={tDashboard('totalQuotesCount', { count: clientQuotes.length })}
          icon="lucide:FileText"
          iconGradient="bg-gradient-quote"
          onAdd={handleCreateQuote}
          addButtonText={tDashboard('newQuote')}
          addButtonIcon="lucide:Plus"
          addButtonGradient="bg-gradient-quote hover:bg-gradient-payment-hover"
          isEmpty={clientQuotes.length === 0}
          emptyState={{
            icon: 'lucide:FileText',
            iconBg: 'bg-gradient-quote-light text-ezbill-quote',
            title: tDashboard('noQuotesYet'),
            description: tDashboard('noQuotesDesc'),
            buttonText: tDashboard('createFirstQuote'),
          }}
        >
          {clientQuotes.length > 0 && (
            <Div className="space-y-4">
              {/* Group By Selector - Only show if 3+ quotes */}
              {clientQuotes.length >= 3 && (
                <Div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={quoteGroupBy === 'month' ? 'default' : 'outline'}
                    onClick={() => setQuoteGroupBy('month')}
                  >
                    <Icon name="lucide:Calendar" className="w-4 h-4 mr-2" />
                    {tDashboard('byMonth')}
                  </Button>
                  <Button
                    size="sm"
                    variant={quoteGroupBy === 'status' ? 'default' : 'outline'}
                    onClick={() => setQuoteGroupBy('status')}
                  >
                    <Icon name="lucide:Tag" className="w-4 h-4 mr-2" />
                    {tDashboard('byStatus')}
                  </Button>
                </Div>
              )}

              {/* Collapsible Groups - Only if 3+ quotes, otherwise flat list */}
              {clientQuotes.length >= 3 ? (
                <CollapsibleGroup
                  groups={quoteGroups}
                  renderItem={quote => {
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
                        onDelete={e => handlers.handleDeleteQuote(quote, e)}
                        onSend={e => handleSendQuote(quote, e)}
                        onAccept={e => handlers.handleAcceptQuote(quote, e)}
                        onDecline={e => handlers.handleDeclineQuote(quote, e)}
                        onDownload={e => handlers.handleDownloadQuote(quote, e)}
                        onConvertToInvoice={e => handleConvertToInvoice(quote, e)}
                      />
                    )
                  }}
                  defaultOpenAll={false}
                  showToggleAll={quoteGroups.length > 2}
                />
              ) : (
                // Flat list for < 3 quotes
                clientQuotes.map(quote => {
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
                      onDelete={e => handlers.handleDeleteQuote(quote, e)}
                      onSend={e => handleSendQuote(quote, e)}
                      onAccept={e => handlers.handleAcceptQuote(quote, e)}
                      onDecline={e => handlers.handleDeclineQuote(quote, e)}
                      onDownload={e => handlers.handleDownloadQuote(quote, e)}
                      onConvertToInvoice={e => handleConvertToInvoice(quote, e)}
                    />
                  )
                })
              )}
            </Div>
          )}
        </DashboardSection>

        {/* Receipts with Grouping */}
        <DashboardSection
          title={tDashboard('receipts')}
          description={tDashboard('totalReceiptsCount', { count: clientReceipts.length })}
          icon="lucide:Receipt"
          iconGradient="bg-gradient-receipt"
          onAdd={() => {}}
          addButtonText=""
          addButtonIcon="lucide:Plus"
          addButtonGradient="bg-gradient-receipt hover:bg-gradient-receipt-hover hidden"
          isEmpty={clientReceipts.length === 0}
          emptyState={{
            icon: 'lucide:Receipt',
            iconBg: 'bg-gradient-receipt-light text-ezbill-receipt',
            title: tDashboard('noReceiptsYet'),
            description: tDashboard('noReceiptsDesc'),
            buttonText: '',
          }}
          className="mb-0"
        >
          {clientReceipts.length > 0 && (
            <Div className="space-y-4">
              {/* Collapsible Groups - Only if 3+ receipts, otherwise flat list */}
              {clientReceipts.length >= 3 ? (
                <CollapsibleGroup
                  groups={receiptGroups}
                  renderItem={receipt => (
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
                  )}
                  defaultOpenAll={false}
                  showToggleAll={receiptGroups.length > 2}
                />
              ) : (
                // Flat list for < 3 receipts
                clientReceipts.map(receipt => (
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
                ))
              )}
            </Div>
          )}
        </DashboardSection>
      </Div>

      {/* CRUD Modals */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={editingInvoice}
        clients={clients}
        companies={companies}
        paymentMethods={paymentMethods}
        clientId={clientId}
        onSave={refetchAll}
      />

      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        quote={editingQuote}
        clients={clients}
        companies={companies}
        clientId={clientId}
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

      {/* Share Modal */}
      {shareState.document && shareState.pdfUrl && (
        <ShareModal
          isOpen={shareState.isOpen}
          onClose={handleCloseShareModal}
          onMarkAsSent={handleMarkAsSent}
          pdfUrl={shareState.pdfUrl}
          documentType={shareState.type}
          documentNumber={
            (shareState.document as Invoice).documentNumber ||
            (shareState.document as Quote).documentNumber ||
            ''
          }
          clientName={client?.clientName || ''}
          documentStatus={
            (shareState.document as Invoice).status || (shareState.document as Quote).status || ''
          }
        />
      )}
    </>
  )
}

export default ClientDashboardPage
