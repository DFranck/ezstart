// /app/(views)/billing/clients/[clientId]/page.tsx
// Path comment ↑ as per your convention.

'use client'

import DashboardSection from '@/components/DashboardSection'
import { InvoiceCard, QuoteCard, ReceiptCard } from '@/components/DocumentCard'
import { InvoiceModal } from '@/components/invoice-modal'
import { MarkPaidModal } from '@/components/mark-paid-modal'
import { QuoteModal } from '@/components/quote-modal'
import StatsCard from '@/components/StatsCard'
import { useBillingContext } from '@/contexts/billing-context'
import { getBillingPermissions } from '@/utils/billing-permissions'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ez-billing/types'
import { useAuth } from '@ezstart/auth-sdk'
import { Button, Card, CardContent, CardHeader, H1, Icon, Modal, P } from '@ezstart/ui/components'
import { useInvoicePDF } from '@ezstart/ui/hooks'
import {
  InvoicePDF,
  ReceiptPDF,
  type PDFInvoiceData,
  type PDFReceiptData,
} from '@ezstart/ui/templates'
import Link from 'next/link'
import { redirect, useParams } from 'next/navigation'
import React, { useState } from 'react'

/** Discriminated union for preview */
type PreviewKind = 'invoice' | 'quote' | 'receipt'
type PreviewDoc = (Invoice | Quote | Receipt) & { _id: string }
type PreviewState = { isOpen: boolean; kind?: PreviewKind; doc?: PreviewDoc }

const getDocTitle = (kind: PreviewKind, doc: PreviewDoc) =>
  `${kind.charAt(0).toUpperCase() + kind.slice(1)} #${(doc as any).documentNumber ?? doc._id}`

const getPdfUrl = (kind: PreviewKind, doc: PreviewDoc) => {
  // Prefer explicit url if your doc already carries one
  const explicit = (doc as any).pdfUrl as string | undefined
  if (explicit) return explicit

  // Fallback: REST endpoint convention
  const base = kind === 'invoice' ? 'invoices' : kind === 'quote' ? 'quotes' : 'receipts'
  // If you mount the API elsewhere, update here:
  return `/api/billing/${base}/${doc._id}/pdf`
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

  // ⬇️ NEW: PDF preview modal state
  const [preview, setPreview] = useState<PreviewState>({ isOpen: false })

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
    e?.stopPropagation() // ⬅️ prevent opening preview
    setEditingInvoice(invoice)
    setIsInvoiceModalOpen(true)
  }

  const handleEditQuote = (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation() // ⬅️ prevent opening preview
    setEditingQuote(quote)
    setIsQuoteModalOpen(true)
  }

  const handleMarkPaid = (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation() // ⬅️ prevent opening preview
    setSelectedInvoice(invoice)
    setIsMarkPaidModalOpen(true)
  }

  const handleSendInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation() // ⬅️ prevent opening preview

    try {
      const { callApi } = await import('@ezstart/ui/utils')
      const { getUserId } = await import('../../../utils/get-user-id')

      const response = await callApi(`/invoices/${invoice._id}`, {
        method: 'PATCH',
        userId: getUserId(),
        body: {
          status: 'sent',
        },
      })

      if (response.ok) {
        // Refresh data
        await refetchAll()
      } else {
        alert('Failed to send invoice')
      }
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Error sending invoice')
    }
  }

  const handleDownloadInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation() // ⬅️ prevent opening preview

    try {
      const client = clients.find(c => c._id === invoice.clientId)
      const company = invoice.companyId
        ? companies.find(c => c._id === invoice.companyId)
        : undefined

      if (!client) {
        alert('Client not found')
        return
      }

      const pdfData = convertToInvoicePDFData(invoice, client, company, paymentMethods)
      const fileName = invoice.documentNumber || invoice._id

      const { pdf } = await import('@react-pdf/renderer')
      const { InvoicePDF } = await import('@ezstart/ui/templates')

      const blob = await pdf(<InvoicePDF data={pdfData} />).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${fileName}.pdf`

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Cleanup
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading invoice:', error)
      alert('Error downloading invoice')
    }
  }

  const handleDownloadReceipt = async (receipt: Receipt, e?: React.MouseEvent) => {
    e?.stopPropagation() // ⬅️ prevent opening preview

    try {
      const client = clients.find(c => c._id === receipt.clientId)
      const company = receipt.companyId
        ? companies.find(c => c._id === receipt.companyId)
        : undefined

      if (!client) {
        alert('Client not found')
        return
      }

      // Generate PDF data for receipt using the same function as modal
      const receiptPDFData = convertToReceiptPDFData(receipt, client, company)

      const fileName = receipt.documentNumber || receipt._id

      const { pdf } = await import('@react-pdf/renderer')

      const blob = await pdf(<ReceiptPDF data={receiptPDFData} />).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `receipt-${fileName}.pdf`

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Cleanup
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading receipt:', error)
      console.error('Receipt data:', receipt)
      console.error('Client data:', client)
      console.error('Company data:', company)
      alert(`Error downloading receipt: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleConvertToInvoice = (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation() // ⬅️ prevent opening preview
    const invoiceData = {
      clientId: quote.clientId,
      companyId: quote.companyId,
      items: quote.items,
      currency: quote.currency,
      notes: quote.notes,
      terms: quote.terms,
      taxRate: quote.taxRate,
      status: 'draft' as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
    setEditingInvoice(invoiceData as any)
    setIsInvoiceModalOpen(true)
  }

  // ⬇️ NEW: open preview helpers
  const openPreview = (kind: PreviewKind, doc: PreviewDoc) => {
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
          <p className="text-foreground/60 font-medium">Loading client dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}

      <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 w-full">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium transition-colors mb-4 group"
        >
          <Icon
            name="lucide:ArrowLeft"
            className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform"
          />
          Back to Dashboard
        </Link>

        <Card variant={'ghost'}>
          {/* Client Info */}
          <CardHeader className="flex-1">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                  client?.isCompany
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
              >
                <Icon
                  name={client?.isCompany ? 'lucide:Building' : 'lucide:User'}
                  className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                />
              </div>
              <div>
                <H1 size={'h3'}>{client?.clientName}</H1>
                <div className="flex items-center space-x-2 mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      client?.isCompany
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-cyan-100 text-cyan-700'
                    }`}
                  >
                    <Icon
                      name={client?.isCompany ? 'lucide:Building2' : 'lucide:User'}
                      className="w-3 h-3 mr-1"
                    />
                    {client?.isCompany ? 'Company' : 'Individual'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {client?.email && (
                <div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                  <Icon name="lucide:Mail" className="w-4 h-4 mr-2 " />
                  <a
                    href={`mailto:${client.email}`}
                    className="hover:text-indigo-600 transition-colors"
                  >
                    {client.email}
                  </a>
                </div>
              )}

              {client?.phone && (
                <div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                  <Icon name="lucide:Phone" className="w-4 h-4 mr-2 " />
                  <a
                    href={`tel:${client.phone}`}
                    className="hover:text-indigo-600 transition-colors"
                  >
                    {client.phone}
                  </a>
                </div>
              )}

              {client?.address && (
                <div className="flex items-center text-sm text-foreground/60  backdrop-blur-sm ">
                  <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 " />
                  <P>
                    {client.address && <span>{client.address}</span>}
                    {client.city && client.country && (
                      <span>
                        {client.city}, {client.country}
                      </span>
                    )}
                  </P>
                </div>
              )}
            </div>
          </CardHeader>

          {/* Action Buttons */}
          <CardContent className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              onClick={handleCreateQuote}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              <Icon name="lucide:FileText" className="w-4 h-4 sm:mr-2" />
              <span className="ml-2 sm:ml-0">New Quote</span>
            </Button>
            <Button
              onClick={handleCreateInvoice}
              className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              <Icon name="lucide:FileEdit" className="w-4 h-4 sm:mr-2" />
              <span className="ml-2 sm:ml-0">New Invoice</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-6 lg:px-8 pb-6 w-full">
        {/* Stats */}
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
            value={clientInvoices.length.toString()}
            icon="lucide:FileEdit"
            iconGradient="bg-gradient-to-r from-blue-400 to-indigo-400"
          />
          <StatsCard
            title="Quotes"
            value={clientQuotes.length.toString()}
            icon="lucide:FileText"
            iconGradient="bg-gradient-to-r from-purple-400 to-pink-400"
          />
        </div>

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
                    onSend={e => handleSendInvoice(invoice, e)}
                    onDownload={e => handleDownloadInvoice(invoice, e)}
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
                  onDownload={e => handleDownloadReceipt(receipt, e)}
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

      {/* ⬇️ NEW: PDF Preview Modal */}
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

/** Convertit les données pour le template PDF Invoice */
function convertToInvoicePDFData(
  invoice: Invoice,
  client: Client,
  company?: Company,
  paymentMethods?: PaymentMethod[]
): PDFInvoiceData {
  return {
    documentNumber: invoice.documentNumber || invoice._id,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    status: invoice.status,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    items: invoice.items.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })),
    client: {
      clientName: client.clientName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      country: client.country,
      contactPersonName: client.contactPersonName,
      contactPersonEmail: client.contactPersonEmail,
      contactPersonPhone: client.contactPersonPhone,
      contactPersonTitle: client.contactPersonTitle,
    },
    company: company
      ? {
          companyName: company.companyName,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          country: company.country,
        }
      : undefined,
    notes: invoice.notes,
    terms: invoice.terms,
    paymentDetails:
      invoice.paymentMethodId && paymentMethods
        ? (() => {
            const paymentMethod = paymentMethods.find(pm => pm._id === invoice.paymentMethodId)
            if (!paymentMethod) return undefined

            return {
              methodName: paymentMethod.name,
              type: paymentMethod.type,
              walletAddress:
                paymentMethod.type === 'crypto_wallet' ? paymentMethod.walletAddress : undefined,
              currency: paymentMethod.type === 'crypto_wallet' ? paymentMethod.currency : undefined,
              network: paymentMethod.type === 'crypto_wallet' ? paymentMethod.network : undefined,
              bankName: paymentMethod.type === 'bank_transfer' ? paymentMethod.bankName : undefined,
              accountNumber:
                paymentMethod.type === 'bank_transfer' ? paymentMethod.accountNumber : undefined,
              iban: paymentMethod.type === 'bank_transfer' ? paymentMethod.iban : undefined,
              swift: paymentMethod.type === 'bank_transfer' ? paymentMethod.swift : undefined,
              routingNumber:
                paymentMethod.type === 'bank_transfer' ? paymentMethod.routingNumber : undefined,
              email: ['paypal', 'wise', 'revolut'].includes(paymentMethod.type)
                ? paymentMethod.email
                : undefined,
              username: ['paypal', 'wise', 'revolut'].includes(paymentMethod.type)
                ? paymentMethod.username
                : undefined,
              instructions: paymentMethod.instructions,
            }
          })()
        : undefined,
  }
}

/** Convertit les données pour le template PDF Receipt */
function convertToReceiptPDFData(
  receipt: Receipt,
  client: Client,
  company?: Company
): PDFReceiptData {
  return {
    documentNumber: receipt.documentNumber || receipt._id,
    createdAt: receipt.createdAt,
    paymentDate: receipt.paymentDate,
    status: receipt.status,
    currency: receipt.currency,
    subtotal: receipt.subtotal,
    taxAmount: receipt.taxAmount,
    total: receipt.total,
    items: receipt.items.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })),
    client: {
      clientName: client.clientName,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      country: client.country,
      contactPersonName: client.contactPersonName,
      contactPersonEmail: client.contactPersonEmail,
      contactPersonPhone: client.contactPersonPhone,
      contactPersonTitle: client.contactPersonTitle,
    },
    company: company
      ? {
          companyName: company.companyName,
          email: company.email,
          phone: company.phone,
          address: company.address,
          city: company.city,
          country: company.country,
        }
      : undefined,
    notes: receipt.notes,
    invoiceReference: receipt.invoiceId ? `INV-${receipt.invoiceId}` : undefined,
  }
}

/** Lightweight, reusable PDF preview modal */
function PreviewPdfModal({
  isOpen,
  onClose,
  kind,
  doc,
}: {
  isOpen: boolean
  onClose: () => void
  kind?: PreviewKind
  doc?: PreviewDoc
}) {
  const { downloadInvoicePDF, isGenerating } = useInvoicePDF()
  const { clients, companies, paymentMethods } = useBillingContext()
  const [pdfBlob, setPdfBlob] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  // ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS
  // Générer le preview automatiquement à l'ouverture
  React.useEffect(() => {
    if (
      isOpen &&
      (kind === 'invoice' || kind === 'receipt') &&
      !pdfBlob &&
      !isGeneratingPreview &&
      doc
    ) {
      const generatePreview = async () => {
        if (kind !== 'invoice' && kind !== 'receipt') {
          return
        }

        const document = doc as Invoice | Receipt
        const client = clients.find(c => c._id === document.clientId)
        const company = document.companyId
          ? companies.find(c => c._id === document.companyId)
          : undefined

        if (!client) return

        setIsGeneratingPreview(true)
        try {
          const { pdf } = await import('@react-pdf/renderer')
          let blob: Blob

          if (kind === 'invoice') {
            const pdfData = convertToInvoicePDFData(
              document as Invoice,
              client,
              company,
              paymentMethods
            )
            blob = await pdf(<InvoicePDF data={pdfData} />).toBlob()
          } else {
            const pdfData = convertToReceiptPDFData(document as Receipt, client, company)
            blob = await pdf(<ReceiptPDF data={pdfData} />).toBlob()
          }

          const url = URL.createObjectURL(blob)
          setPdfBlob(url)
        } catch (error) {
          console.error('Erreur génération preview PDF:', error)
        } finally {
          setIsGeneratingPreview(false)
        }
      }
      generatePreview()
    }
  }, [isOpen, kind, pdfBlob, isGeneratingPreview, doc, clients, companies, paymentMethods])

  if (!isOpen || !kind || !doc) return null

  const title = getDocTitle(kind, doc)
  const pdfUrl = getPdfUrl(kind, doc)

  const generatePDFData = () => {
    if (kind !== 'invoice' && kind !== 'receipt') return null

    const document = doc as Invoice | Receipt
    const client = clients.find(c => c._id === document.clientId)
    const company = document.companyId
      ? companies.find(c => c._id === document.companyId)
      : undefined

    if (!client) return null

    if (kind === 'invoice') {
      return convertToInvoicePDFData(document as Invoice, client, company, paymentMethods)
    } else {
      return convertToReceiptPDFData(document as Receipt, client, company)
    }
  }

  const handleGeneratePreview = async () => {
    if (kind !== 'invoice' && kind !== 'receipt') {
      alert("La génération PDF n'est disponible que pour les factures et reçus")
      return
    }

    const pdfData = generatePDFData()
    if (!pdfData) {
      alert('Client non trouvé')
      return
    }

    setIsGeneratingPreview(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      let blob: Blob

      if (kind === 'invoice') {
        blob = await pdf(<InvoicePDF data={pdfData as PDFInvoiceData} />).toBlob()
      } else {
        blob = await pdf(<ReceiptPDF data={pdfData as PDFReceiptData} />).toBlob()
      }

      const url = URL.createObjectURL(blob)
      setPdfBlob(url)
    } catch (error) {
      console.error('Erreur génération preview PDF:', error)
      alert('Erreur lors de la génération du preview PDF')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleDownloadPDF = async () => {
    const pdfData = generatePDFData()
    if (!pdfData) {
      alert('Client non trouvé')
      return
    }

    try {
      const document = doc as Invoice | Receipt
      const fileName = document.documentNumber || document._id

      if (kind === 'invoice') {
        await downloadInvoicePDF(<InvoicePDF data={pdfData as PDFInvoiceData} />, fileName)
      } else {
        // For receipts, use the same download mechanism but with receipt template
        const { pdf } = await import('@react-pdf/renderer')
        const blob = await pdf(<ReceiptPDF data={pdfData as PDFReceiptData} />).toBlob()

        // Create download link
        const url = URL.createObjectURL(blob)
        const link = window.document.createElement('a')
        link.href = url
        link.download = `receipt-${fileName}.pdf`
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error)
      alert('Erreur lors du téléchargement du PDF')
    }
  }

  // Nettoyer l'URL quand le modal se ferme
  const handleClose = () => {
    if (pdfBlob) {
      URL.revokeObjectURL(pdfBlob)
      setPdfBlob(null)
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <>
          <Icon
            name={
              kind === 'invoice'
                ? 'lucide:FileEdit'
                : kind === 'quote'
                  ? 'lucide:FileText'
                  : 'lucide:Receipt'
            }
            className="w-5 h-5 mr-2 text-foreground/60"
          />
          <span className="font-semibold">{title}</span>
        </>
      }
      description={
        <>
          Click outside or press <kbd className="px-1 py-0.5 border rounded">Esc</kbd> to close
        </>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {/* <span className="text-xs text-gray-500 truncate">{pdfUrl}</span> */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview}
              className="hover:bg-gray-50"
            >
              <Icon
                name={isGeneratingPreview ? 'lucide:Loader2' : 'lucide:Eye'}
                className={`w-4 h-4 mr-2 ${isGeneratingPreview ? 'animate-spin' : ''}`}
              />
              {isGeneratingPreview ? 'Génération...' : 'Refresh Preview'}
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating || !pdfBlob}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Icon
                name={isGenerating ? 'lucide:Loader2' : 'lucide:Download'}
                className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`}
              />
              {isGenerating ? 'Téléchargement...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      }
      className="max-w-[1100px] w-[98vw]"
    >
      {/* PDF container */}
      <div className="">
        {pdfBlob ? (
          <>
            {/* Desktop PDF Preview */}
            <iframe
              src={`${pdfBlob}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="hidden sm:block w-full h-[50vh]"
              title={`${title} – PDF preview`}
            />
            {/* Mobile PDF Download */}
            <div className="sm:hidden flex flex-col items-center justify-center p-8 text-center h-[50vh] bg-muted/20 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <Icon name="lucide:FileDown" className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Ready</h3>
              <p className="text-foreground/60 mb-4 text-sm">
                PDF preview is not supported on mobile. Download to view.
              </p>
              <Button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = pdfBlob
                  link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Icon name="lucide:Download" className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6">
              <Icon
                name={isGeneratingPreview ? 'lucide:Loader2' : 'lucide:FileText'}
                className={`w-10 h-10 text-blue-500 ${isGeneratingPreview ? 'animate-spin' : ''}`}
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isGeneratingPreview ? 'Generating PDF Preview...' : 'Instant PDF Generation'}
            </h3>
            <p className="text-foreground/60 mb-6 max-w-md">
              {isGeneratingPreview
                ? 'Please wait while we generate your PDF preview...'
                : `Click "Refresh Preview" to generate and preview your ${kind === 'invoice' ? 'invoice' : kind === 'quote' ? 'quote' : 'receipt'} PDF.`}
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Icon name="lucide:Zap" className="w-4 h-4 text-yellow-500" />
              <span>Client-side generation • No server required</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
