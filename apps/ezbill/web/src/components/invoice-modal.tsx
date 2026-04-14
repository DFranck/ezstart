'use client'
import { callApi, runWithFeedback } from '@/config/api'
import {
  BaseLineItem,
  BillingType,
  Client,
  Company,
  CreateInvoice,
  Currency,
  Invoice,
  PaymentMethod,
} from '@ezbill/types'
import { Button, Icon, Modal, Div } from '@ezstart/ui/components'
import { useAuth } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { cn } from '@ezstart/ui/lib'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { InvoiceAIAssistant, InvoiceAction } from './invoice-ai-assistant'
import { LoadingButton } from './loading-button'
import { FormFields } from './invoice/form-fields'
import { ItemsTable } from './invoice/items-table'
import { InvoiceSummary } from './invoice/summary'

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  companies: Company[]
  paymentMethods: PaymentMethod[]
  invoice?: Invoice
  onSave: () => void
  onManagePaymentMethods?: () => void
  clientId?: string // Optional: if we're in a specific client context
}

export function InvoiceModal({
  isOpen,
  onClose,
  clients,
  companies,
  paymentMethods,
  invoice,
  onSave,
  onManagePaymentMethods,
  clientId,
}: InvoiceModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showTaxes, setShowTaxes] = useState(invoice?.taxRate ? invoice.taxRate > 0 : false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const tToast = useTranslations('toast')
  const tCommon = useTranslations('common')
  const tInvoice = useTranslations('invoice')
  const [aiConversationHistory, setAiConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >(invoice?.aiConversationHistory || [])

  const [formData, setFormData] = useState<CreateInvoice & { paymentMethodIds?: string[] }>({
    userId: '', // Will be set in handleSubmit
    clientId:
      invoice?.clientId || clientId || (clients.length > 0 && clients[0] ? clients[0]._id : ''),
    companyId: invoice?.companyId || '',
    billingType: (invoice?.billingType as BillingType) || 'itemized',
    items: invoice?.items?.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })) || [{ label: '', quantity: 1, price: 0 }],
    description: invoice?.description || '',
    flatRateAmount: invoice?.flatRateAmount || 0,
    currency: invoice?.currency || 'USD',
    dueDate: invoice?.dueDate || '',
    notes: invoice?.notes || '',
    terms: invoice?.terms || '',
    taxRate: invoice?.taxRate || 0,
    paymentMethodIds:
      invoice?.paymentMethodIds || paymentMethods?.filter(p => p.isDefault).map(p => p._id) || [],
    aiConversationHistory: invoice?.aiConversationHistory || [],
  })

  // Sync AI conversation history to formData
  useEffect(() => {
    setFormData(prev => ({ ...prev, aiConversationHistory }))
  }, [aiConversationHistory])

  // Update form data and AI history when invoice changes
  useEffect(() => {
    setAiConversationHistory(invoice?.aiConversationHistory || [])
    setFormData({
      userId: '',
      clientId:
        invoice?.clientId || clientId || (clients.length > 0 && clients[0] ? clients[0]._id : ''),
      companyId: invoice?.companyId || '',
      billingType: (invoice?.billingType as BillingType) || 'itemized',
      items: invoice?.items?.map(item => ({
        label: item.label,
        quantity: item.quantity,
        price: item.price,
      })) || [{ label: '', quantity: 1, price: 0 }],
      description: invoice?.description || '',
      flatRateAmount: invoice?.flatRateAmount || 0,
      currency: invoice?.currency || 'USD',
      dueDate: invoice?.dueDate || '',
      notes: invoice?.notes || '',
      terms: invoice?.terms || '',
      taxRate: invoice?.taxRate || 0,
      paymentMethodIds:
        invoice?.paymentMethodIds || paymentMethods?.filter(p => p.isDefault).map(p => p._id) || [],
      aiConversationHistory: invoice?.aiConversationHistory || [],
    })
    setShowTaxes(invoice?.taxRate ? invoice.taxRate > 0 : false)
  }, [invoice, clientId, clients, paymentMethods])

  // Handle incremental AI actions
  const handleAIAction = (action: InvoiceAction) => {
    switch (action.type) {
      case 'replace_all': {
        const data = action.data
        const updates: Partial<typeof formData> = {}

        if (data.clientName && clients.length > 0) {
          const matchingClient = clients.find(
            c =>
              c.clientName?.toLowerCase().includes(data.clientName!.toLowerCase()) ||
              c.email?.toLowerCase().includes(data.clientName!.toLowerCase())
          )
          if (matchingClient) {
            updates.clientId = matchingClient._id
          }
        }

        if (data.items && data.items.length > 0) {
          updates.items = data.items
          updates.billingType = 'itemized'
        }

        if (data.description && data.flatRateAmount !== undefined) {
          updates.description = data.description
          updates.flatRateAmount = data.flatRateAmount
          updates.billingType = 'flat-rate'
        }

        if (data.description) updates.description = data.description
        if (data.dueDate) updates.dueDate = data.dueDate
        if (data.notes) updates.notes = data.notes
        if (data.currency) updates.currency = data.currency
        if (data.taxRate !== undefined) {
          updates.taxRate = data.taxRate
          setShowTaxes(data.taxRate > 0)
        }

        setFormData(prev => ({ ...prev, ...updates }))
        break
      }

      case 'update_items':
        setFormData(prev => ({ ...prev, items: action.items, billingType: 'itemized' }))
        break

      case 'add_items':
        setFormData(prev => ({
          ...prev,
          items: [...(prev.items || []), ...action.items],
          billingType: 'itemized',
        }))
        break

      case 'remove_items':
        setFormData(prev => ({
          ...prev,
          items: prev.items?.filter((_, index) => !action.indices.includes(index)) || [],
        }))
        break

      case 'update_client': {
        const matchingClient = clients.find(
          c =>
            c.clientName?.toLowerCase().includes(action.clientName.toLowerCase()) ||
            c.email?.toLowerCase().includes(action.clientName.toLowerCase())
        )
        if (matchingClient) {
          setFormData(prev => ({ ...prev, clientId: matchingClient._id }))
        }
        break
      }

      case 'update_description':
        setFormData(prev => ({ ...prev, description: action.description }))
        break

      case 'update_flat_rate':
        setFormData(prev => ({
          ...prev,
          description: action.description,
          flatRateAmount: action.flatRateAmount,
          billingType: 'flat-rate' as BillingType,
        }))
        break

      case 'update_payment_terms':
        setFormData(prev => ({ ...prev, notes: action.notes }))
        break

      case 'update_currency':
        setFormData(prev => ({ ...prev, currency: action.currency }))
        break

      case 'update_due_date':
        setFormData(prev => ({ ...prev, dueDate: action.dueDate }))
        break

      case 'update_tax_rate':
        setFormData(prev => ({ ...prev, taxRate: action.taxRate }))
        setShowTaxes(action.taxRate > 0)
        break
    }
  }

  // LEGACY: Keep old handler for backward compatibility
  const handleAIExtraction = (data: {
    clientName?: string
    items?: Array<{ label: string; quantity: number; price: number }>
    description?: string
    dueDate?: string
    notes?: string
    currency?: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'VND' | 'THB' | 'AUD' | 'CAD' | 'CNY' | 'CHF'
    taxRate?: number
  }) => {
    handleAIAction({ type: 'replace_all', data })
  }

  // Calculs
  const subtotal =
    formData.billingType === 'flat-rate'
      ? formData.flatRateAmount || 0
      : formData.items?.reduce((sum, item) => sum + item.quantity * item.price, 0) || 0
  const taxAmount = showTaxes ? (subtotal * (formData.taxRate || 0)) / 100 : 0
  const total = subtotal + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const userId = user?._id
    logger.debug('Form submitted!', { formData, userId })
    if (!userId) {
      logger.debug('No user ID found!')
      return
    }

    const dataToSend = {
      ...formData,
      userId,
      // In flat-rate mode, don't send empty placeholder items
      items: formData.billingType === 'flat-rate' ? [] : formData.items,
    }

    const headers = user?._id ? { 'X-User-Id': user._id } : undefined

    return runWithFeedback({
      action: async () => {
        if (invoice) {
          await callApi(`/invoices/${invoice._id}`, {
            method: 'PUT',
            headers,
            body: dataToSend,
          })
        } else {
          await callApi('/invoices', {
            method: 'POST',
            headers,
            body: dataToSend,
          })
        }
        onSave()
        onClose()
      },
      toastLoading: { message: invoice ? tToast('invoiceUpdating') : tToast('invoiceCreating') },
      toastSuccess: { message: invoice ? tToast('invoiceUpdated') : tToast('invoiceCreated') },
      toastError: {
        message: invoice ? tToast('invoiceUpdateFailed') : tToast('invoiceCreateFailed'),
      },
      onLoadingChange: setIsLoading,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={cn('', { 'max-w-5xl': showAIAssistant })}
      title={invoice ? tInvoice('edit') : tInvoice('create')}
      description={invoice ? tInvoice('edit') : tInvoice('create')}
      footer={
        <Div className="flex gap-3">
          {!showAIAssistant && (
            <InvoiceAIAssistant
              isCollapsed={true}
              onToggle={() => setShowAIAssistant(true)}
              onAction={handleAIAction}
              onDataExtracted={handleAIExtraction}
              initialHistory={aiConversationHistory}
              onHistoryChange={setAiConversationHistory}
              billingType={formData.billingType}
              currentInvoiceData={{
                items: formData.items,
                currency: formData.currency,
                description: formData.description,
                flatRateAmount: formData.flatRateAmount,
                notes: formData.notes,
                taxRate: formData.taxRate,
              }}
            />
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-card border  hover:bg-muted font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Icon name="lucide:X" className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            {tCommon('cancel')}
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={
              !formData.clientId ||
              (formData.billingType === 'itemized' &&
                (!formData.items || formData.items.some(item => !item.label))) ||
              (formData.billingType === 'flat-rate' &&
                (!formData.description || !formData.flatRateAmount))
            }
            form="invoice-form"
            className="bg-gradient-invoice hover:bg-gradient-invoice-hover text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Icon
              name={invoice ? 'lucide:Save' : 'lucide:Plus'}
              className="w-5 h-5 sm:w-4 sm:h-4 mr-2"
            />
            {invoice ? tInvoice('update') : tInvoice('create')}
          </LoadingButton>
        </Div>
      }
    >
      <Div className="flex flex-col lg:flex-row gap-0 relative">
        {/* Main Form */}
        <Div className={showAIAssistant ? 'w-full lg:w-2/3 lg:pr-4' : 'w-full'}>
          <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6 p-1">
            <FormFields
              formData={formData}
              setFormData={setFormData}
              clients={clients}
              companies={companies}
              paymentMethods={paymentMethods}
              showTaxes={showTaxes}
              setShowTaxes={setShowTaxes}
              showAIAssistant={showAIAssistant}
              clientId={clientId}
              onManagePaymentMethods={onManagePaymentMethods}
            />

            <ItemsTable formData={formData} setFormData={setFormData} />

            <InvoiceSummary
              formData={formData}
              setFormData={setFormData}
              showTaxes={showTaxes}
              subtotal={subtotal}
              taxAmount={taxAmount}
              total={total}
            />
          </form>
        </Div>

        {/* AI Assistant Sidebar (when expanded) */}
        {showAIAssistant && (
          <Div className="w-full lg:w-1/3 mt-4 lg:mt-0">
            <InvoiceAIAssistant
              isCollapsed={false}
              onToggle={() => setShowAIAssistant(false)}
              onAction={handleAIAction}
              onDataExtracted={handleAIExtraction}
              initialHistory={aiConversationHistory}
              onHistoryChange={setAiConversationHistory}
              billingType={formData.billingType}
              currentInvoiceData={{
                items: formData.items,
                currency: formData.currency,
                description: formData.description,
                flatRateAmount: formData.flatRateAmount,
                notes: formData.notes,
                taxRate: formData.taxRate,
              }}
            />
          </Div>
        )}
      </Div>
    </Modal>
  )
}
