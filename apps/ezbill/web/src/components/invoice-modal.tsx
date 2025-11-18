'use client'
import { callApi, parseApiError, runWithFeedback } from '@/utils/api'
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
import {
  Button,
  Checkbox,
  Icon,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { useEffect, useState } from 'react'
import { getUserId } from '../utils/get-user-id'
import { InvoiceAIAssistant } from './invoice-ai-assistant'
import { LoadingButton } from './loading-button'

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

const currencies: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
]

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
  const [isLoading, setIsLoading] = useState(false)
  const [showTaxes, setShowTaxes] = useState(invoice?.taxRate ? invoice.taxRate > 0 : false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiConversationHistory, setAiConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    invoice?.aiConversationHistory || []
  )

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
    paymentMethodIds: paymentMethods?.filter(p => p.isDefault).map(p => p._id) || [],
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
      paymentMethodIds: paymentMethods?.filter(p => p.isDefault).map(p => p._id) || [],
      aiConversationHistory: invoice?.aiConversationHistory || [],
    })
    setShowTaxes(invoice?.taxRate ? invoice.taxRate > 0 : false)
  }, [invoice, clientId, clients, paymentMethods])

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), { label: '', quantity: 1, price: 0 }],
    })
  }

  const updateLineItem = (index: number, field: keyof BaseLineItem, value: any) => {
    const updatedItems = [...(formData.items || [])]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    } as BaseLineItem
    setFormData({ ...formData, items: updatedItems })
  }

  const removeLineItem = (index: number) => {
    if (formData.items && formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: updatedItems })
    }
  }

  // Handle AI-extracted data
  const handleAIExtraction = (data: {
    clientName?: string
    items?: Array<{ label: string; quantity: number; price: number }>
    description?: string
    dueDate?: string
    notes?: string
    currency?: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'VND' | 'THB' | 'AUD' | 'CAD' | 'CNY' | 'CHF'
    taxRate?: number
  }) => {
    const updates: Partial<typeof formData> = {}

    // Try to find matching client by name
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

    // Update items if provided
    if (data.items && data.items.length > 0) {
      updates.items = data.items
      updates.billingType = 'itemized'
    }

    // Update other fields
    if (data.description) updates.description = data.description
    if (data.dueDate) updates.dueDate = data.dueDate
    if (data.notes) updates.notes = data.notes
    if (data.currency) updates.currency = data.currency
    if (data.taxRate !== undefined) {
      updates.taxRate = data.taxRate
      setShowTaxes(data.taxRate > 0)
    }

    setFormData(prev => ({ ...prev, ...updates }))
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
    const userId = getUserId()
    console.log('Form submitted!', { formData, userId })
    if (!userId) {
      console.log('No user ID found!')
      return
    }

    const dataToSend = { ...formData, userId }

    return runWithFeedback({
      action: async () => {
        if (invoice) {
          const res = await callApi(`/invoices/${invoice._id}`, {
            method: 'PUT',
            userId: getUserId(),
            body: dataToSend,
          })
          if (!res.ok) throw new Error(parseApiError(res.data))
        } else {
          const res = await callApi('/invoices', {
            method: 'POST',
            userId: getUserId(),
            body: dataToSend,
          })
          if (!res.ok) throw new Error(parseApiError(res.data))
        }
        onSave()
        onClose()
      },
      toastLoading: { message: invoice ? 'Updating invoice...' : 'Creating invoice...' },
      toastSuccess: { message: invoice ? 'Invoice updated' : 'Invoice created' },
      toastError: { message: invoice ? 'Failed to update invoice' : 'Failed to create invoice' },
      onLoadingChange: setIsLoading,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={cn('', { 'max-w-5xl': showAIAssistant })}
      title={invoice ? 'Edit Invoice' : 'Create Invoice'}
      description={invoice ? 'Update invoice information' : 'Create a new invoice for your client'}
      footer={
        <div className="flex gap-3">
          {/* AI Assistant Toggle Button (when collapsed) */}
          {!showAIAssistant && (
            <InvoiceAIAssistant
              isCollapsed={true}
              onToggle={() => setShowAIAssistant(true)}
              onDataExtracted={handleAIExtraction}
              initialHistory={aiConversationHistory}
              onHistoryChange={setAiConversationHistory}
              currentInvoiceData={{
                items: formData.items,
                currency: formData.currency,
                description: formData.description,
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
            Cancel
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
            {invoice ? 'Update Invoice' : 'Create Invoice'}
          </LoadingButton>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-0 relative">
        {/* Main Form */}
        <div className={showAIAssistant ? 'w-full lg:w-2/3 lg:pr-4' : 'w-full'}>
          <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6 p-1">
            <div
              className={`grid gap-6 ${showAIAssistant ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}
            >
              {!clientId && (
                <div>
                  <Label className="text-sm font-medium  mb-3 block flex items-center">
                    <Icon name="lucide:User" className="w-4 h-4 mr-2 text-ezbill-client" />
                    Client *
                  </Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={value => setFormData({ ...formData, clientId: value })}
                    required
                  >
                    <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-xl rounded-xl">
                      {clients.map(client => (
                        <SelectItem
                          key={client._id}
                          value={client._id}
                          className="hover:bg-primary/5"
                        >
                          <div className="flex items-center">{client.clientName}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium  mb-3 block flex items-center">
                  <Icon name="lucide:Building2" className="w-4 h-4 mr-2 text-ezbill-company" />
                  Bill on behalf of
                </Label>
                <Select
                  value={formData.companyId || 'personal'}
                  onValueChange={value =>
                    setFormData({ ...formData, companyId: value === 'personal' ? '' : value })
                  }
                >
                  <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
                    <SelectValue placeholder="Select billing entity" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-xl rounded-xl">
                    <SelectItem value="personal" className="hover:bg-primary/5">
                      <div className="flex items-center">
                        <Icon name="lucide:User" className="w-4 h-4 mr-2 text-ezbill-client" />
                        Personal (your name)
                      </div>
                    </SelectItem>
                    {companies?.map(company => (
                      <SelectItem
                        key={company._id}
                        value={company._id}
                        className="hover:bg-primary/5"
                      >
                        <div className="flex items-center">
                          <Icon
                            name="lucide:Building2"
                            className="w-4 h-4 mr-2 text-ezbill-company"
                          />
                          {company.companyName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block flex items-center">
                  <Icon name="lucide:CreditCard" className="w-4 h-4 mr-2 text-ezbill-payment" />
                  Payment Methods
                </Label>
                {paymentMethods && paymentMethods.length > 0 ? (
                  <div className="space-y-2 border rounded-lg p-3">
                    {paymentMethods.map(method => {
                      const isChecked = formData.paymentMethodIds?.includes(method._id) || false
                      return (
                        <div key={method._id} className="flex items-center space-x-3">
                          <Checkbox
                            id={`payment-${method._id}`}
                            checked={isChecked}
                            onCheckedChange={(checked: boolean) => {
                              const currentIds = formData.paymentMethodIds || []
                              const newIds = checked
                                ? [...currentIds, method._id]
                                : currentIds.filter(id => id !== method._id)
                              setFormData({ ...formData, paymentMethodIds: newIds })
                            }}
                          />
                          <Label
                            htmlFor={`payment-${method._id}`}
                            className="flex items-center flex-1 cursor-pointer"
                          >
                            <Icon
                              name={
                                method.type === 'crypto_wallet'
                                  ? 'lucide:Wallet'
                                  : method.type === 'bank_transfer'
                                    ? 'lucide:Building'
                                    : method.type === 'cash'
                                      ? 'lucide:Banknote'
                                      : 'lucide:CreditCard'
                              }
                              className="w-4 h-4 mr-2 text-ezbill-payment"
                            />
                            <span>{method.name}</span>
                            {method.isDefault && (
                              <span className="ml-2 text-xs text-success">(Default)</span>
                            )}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-orange-50/50 backdrop-blur-sm rounded-xl p-4 border border-orange-200/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon name="lucide:AlertCircle" className="w-5 h-5 text-warning mr-2" />
                        <span className="text-sm text-warning">No payment methods configured</span>
                      </div>
                      {onManagePaymentMethods && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={onManagePaymentMethods}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          <Icon name="lucide:Plus" className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />
                          Add Method
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium  mb-3 block flex items-center">
                  <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2 text-warning" />
                  Currency
                </Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: Currency) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-xl rounded-xl">
                    {currencies.map(({ value, label, symbol }) => (
                      <SelectItem key={value} value={value} className="hover:bg-primary/5">
                        <div className="flex items-center">
                          {label}
                          <Span className="ml-2 text-warning">{symbol}</Span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium  mb-3 block flex items-center">
                  <Icon name="lucide:Calendar" className="w-4 h-4 mr-2 text-warning" />
                  Due Date
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="">
                  <div className="flex items-center space-x-3 mb-4">
                    <Checkbox
                      id="showTaxes"
                      checked={showTaxes}
                      onCheckedChange={(checked: boolean) => {
                        setShowTaxes(checked)
                        if (checked) {
                          setFormData({ ...formData, taxRate: 20 })
                        } else {
                          setFormData({ ...formData, taxRate: 0 })
                        }
                      }}
                      className="border-primary/30 text-primary focus:ring-primary"
                    />
                    <Label
                      htmlFor="showTaxes"
                      className="text-sm font-medium  flex items-center cursor-pointer"
                    >
                      <Icon name="lucide:Calculator" className="w-4 h-4 mr-2 text-warning" />
                      Add Taxes
                    </Label>
                  </div>
                  {showTaxes && (
                    <div>
                      <Label className="text-sm font-medium  mb-3 block flex items-center">
                        <Icon name="lucide:Percent" className="w-4 h-4 mr-2 text-warning" />
                        Tax Rate (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={formData.taxRate}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            taxRate: parseFloat(e.target.value.replace(',', '.')) || 0,
                          })
                        }
                        className="w-full  focus:ring-2 focus:ring-warning focus:border-warning transition-all duration-200 shadow-sm hover:shadow-md"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              {/* Billing Type Toggle */}
              <div className="mb-6">
                <Label className="text-sm font-medium mb-3 block flex items-center">
                  <Icon name="lucide:FileType" className="w-4 h-4 mr-2 text-primary" />
                  Billing Type *
                </Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.billingType === 'itemized' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, billingType: 'itemized' })}
                    className="flex-1"
                  >
                    <Icon name="lucide:List" className="w-4 h-4 mr-2" />
                    Itemized
                  </Button>
                  <Button
                    type="button"
                    variant={formData.billingType === 'flat-rate' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, billingType: 'flat-rate' })}
                    className="flex-1"
                  >
                    <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
                    Flat Rate
                  </Button>
                </div>
              </div>

              {/* Itemized Mode: Table */}
              {formData.billingType === 'itemized' && (
                <>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="rounded-xl overflow-hidden">
                      <Table className="w-full min-w-[600px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold ">
                              <div className="flex items-center">
                                <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
                                Description
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold w-24">
                              <div className="flex items-center">
                                <Icon name="lucide:Hash" className="w-4 h-4 mr-2" />
                                Qty
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold w-28">
                              <div className="flex items-center">
                                <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2" />
                                Price
                              </div>
                            </TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.items?.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="min-w-[200px]">
                                <Input
                                  placeholder="Description"
                                  value={item.label}
                                  onChange={e => updateLineItem(index, 'label', e.target.value)}
                                  required
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  min="0"
                                  step="0.5"
                                  value={item.quantity === 0 ? '' : item.quantity}
                                  onChange={e =>
                                    updateLineItem(
                                      index,
                                      'quantity',
                                      parseFloat(e.target.value.replace(',', '.')) || 0
                                    )
                                  }
                                  required
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="Price"
                                  min="0"
                                  step="0.5"
                                  value={item.price === 0 ? '' : item.price}
                                  onChange={e =>
                                    updateLineItem(
                                      index,
                                      'price',
                                      parseFloat(e.target.value.replace(',', '.')) || 0
                                    )
                                  }
                                  required
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size={'icon'}
                                  onClick={() => removeLineItem(index)}
                                  disabled={(formData.items?.length || 0) <= 1}
                                >
                                  <Icon name="lucide:X" className="w-5 h-5 sm:w-4 sm:h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="mt-2" onClick={addLineItem}>
                    <Icon name="lucide:Plus" className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                    Add Line Item
                  </Button>
                </>
              )}

              {/* Flat-Rate Mode: Description + Amount */}
              {formData.billingType === 'flat-rate' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-3 block flex items-center">
                      <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-primary" />
                      Description *
                    </Label>
                    <TextArea
                      placeholder="Describe the work or service provided..."
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={6}
                      className="w-full resize-none"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-3 block flex items-center">
                      <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2 text-success" />
                      Amount *
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter flat rate amount"
                      min="0"
                      step="0.01"
                      value={formData.flatRateAmount === 0 ? '' : formData.flatRateAmount}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          flatRateAmount: parseFloat(e.target.value.replace(',', '.')) || 0,
                        })
                      }
                      required
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Totals */}
            <div>
              <div className="flex items-center mb-4">
                <Icon name="lucide:Calculator" className="w-5 h-5 mr-2 text-primary" />
                <h3 className="text-lg font-semibold ">Invoice Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm bg-muted/40 backdrop-blur-sm rounded-lg p-3">
                  <span className="flex items-center font-medium ">
                    <Icon name="lucide:Minus" className="w-4 h-4 mr-2" />
                    Subtotal:
                  </span>
                  <span className="font-semibold ">
                    {subtotal.toFixed(2)} {formData.currency}
                  </span>
                </div>
                {showTaxes && (
                  <div className="flex justify-between items-center text-sm bg-muted/40 backdrop-blur-sm rounded-lg p-3">
                    <span className="flex items-center font-medium ">
                      <Icon name="lucide:Percent" className="w-4 h-4 mr-2" />
                      Tax ({formData.taxRate}%):
                    </span>
                    <span className="font-semibold ">
                      {taxAmount.toFixed(2)} {formData.currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-gradient-invoice text-white rounded-lg p-4 shadow-lg">
                  <span className="flex items-center font-bold text-lg">
                    <Icon name="lucide:DollarSign" className="w-5 h-5 mr-2" />
                    Total:
                  </span>
                  <span className="font-bold text-xl">
                    {total.toFixed(2)} {formData.currency}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium  mb-3 block flex items-center">
                <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-primary" />
                Notes
              </Label>
              <TextArea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                placeholder="Additional notes for this invoice..."
              />
            </div>

            <div>
              <Label className="text-sm font-medium  mb-3 block flex items-center">
                <Icon name="lucide:FileCheck" className="w-4 h-4 mr-2 text-primary" />
                Terms & Conditions
              </Label>
              <TextArea
                value={formData.terms}
                onChange={e => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                placeholder="Payment due upon receipt. Late payment penalties may apply..."
              />
            </div>
          </form>
        </div>

        {/* AI Assistant Sidebar (when expanded) */}
        {showAIAssistant && (
          <div className="w-full lg:w-1/3 mt-4 lg:mt-0">
            <InvoiceAIAssistant
              isCollapsed={false}
              onToggle={() => setShowAIAssistant(false)}
              onDataExtracted={handleAIExtraction}
              initialHistory={aiConversationHistory}
              onHistoryChange={setAiConversationHistory}
              currentInvoiceData={{
                items: formData.items,
                currency: formData.currency,
                description: formData.description,
                notes: formData.notes,
                taxRate: formData.taxRate,
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
