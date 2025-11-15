'use client'

import { callApi, parseApiError, runWithFeedback } from '@/utils/api'
import { BaseLineItem, BillingType, Client, Company, CreateQuote, Currency, Quote } from '@ezbill/types'
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
import { useState } from 'react'
import { getUserId } from '../utils/get-user-id'
import { InvoiceAIAssistant } from './invoice-ai-assistant'
import { LoadingButton } from './loading-button'

interface QuoteModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Client[]
  companies: Company[]
  quote?: Quote
  onSave: () => void
  clientId?: string // Optional: if we're in a specific client context
}

const currencies: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
]

export function QuoteModal({
  isOpen,
  onClose,
  clients,
  companies,
  quote,
  onSave,
  clientId,
}: QuoteModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showTaxes, setShowTaxes] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)

  const [formData, setFormData] = useState<CreateQuote & { validUntil?: string }>({
    userId: '',
    clientId:
      quote?.clientId || clientId || (clients.length > 0 && clients[0] ? clients[0]._id : ''),
    companyId: quote?.companyId || '',
    billingType: (quote?.billingType as BillingType) || 'itemized',
    items: quote?.items?.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })) || [{ label: '', quantity: 1, price: 0 }],
    description: quote?.description || '',
    flatRateAmount: quote?.flatRateAmount || 0,
    currency: quote?.currency || 'USD',
    dueDate: quote?.dueDate || '',
    notes: quote?.notes || '',
    terms: quote?.terms || '',
    taxRate: quote?.taxRate || 0,
    validUntil: quote?.validUntil || '',
  })

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), { label: '', quantity: 1, price: 0 }],
    })
  }

  const updateLineItem = (index: number, field: keyof BaseLineItem, value: any) => {
    const updatedItems = [...(formData.items || [])]
    updatedItems[index] = { ...updatedItems[index], [field]: value } as BaseLineItem
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
    currency?: 'USD' | 'EUR'
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

    const dataToSend = { ...formData, userId: getUserId() }

    return runWithFeedback({
      action: async () => {
        if (quote) {
          const res = await callApi(`/quotes/${quote._id}`, {
            method: 'PUT',
            userId: getUserId(),
            body: dataToSend,
          })
          if (!res.ok) throw new Error(parseApiError(res.data))
        } else {
          const res = await callApi('/quotes', {
            method: 'POST',
            userId: getUserId(),
            body: dataToSend,
          })
          if (!res.ok) throw new Error(parseApiError(res.data))
        }
        onSave()
        onClose()
      },
      toastLoading: { message: quote ? 'Updating quote...' : 'Creating quote...' },
      toastSuccess: { message: quote ? 'Quote updated' : 'Quote created' },
      toastError: { message: quote ? 'Failed to update quote' : 'Failed to create quote' },
      onLoadingChange: setIsLoading,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={quote ? 'Edit Quote' : 'Create Quote'}
      description={quote ? 'Update quote information' : 'Create a new quote for your client'}
      size="xl"
      footer={
        <div className="space-y-4">
          <div className="flex gap-3 justify-end">
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
              form="quote-form"
              className="bg-gradient-quote text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Icon name={quote ? 'lucide:Save' : 'lucide:Plus'} className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
              {quote ? 'Update Quote' : 'Create Quote'}
            </LoadingButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-0 relative">
        {/* AI Assistant Toggle Button (when collapsed) */}
        {!showAIAssistant && (
          <InvoiceAIAssistant
            isCollapsed={true}
            onToggle={() => setShowAIAssistant(true)}
            onDataExtracted={handleAIExtraction}
          />
        )}

        {/* Main Form */}
        <div className={showAIAssistant ? 'w-full lg:w-2/3 lg:pr-4' : 'w-full'}>
          <form id="quote-form" onSubmit={handleSubmit} className="space-y-6 p-1">
          <div className={`grid gap-6 ${showAIAssistant ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
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
                  <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-warning focus:border-warning transition-all duration-200 shadow-sm hover:shadow-md">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-xl rounded-xl">
                    {clients.map(client => (
                      <SelectItem
                        key={client._id}
                        value={client._id}
                        className="hover:bg-warning/5"
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
                <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-warning focus:border-warning transition-all duration-200 shadow-sm hover:shadow-md">
                  <SelectValue placeholder="Select billing entity" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-xl rounded-xl">
                  <SelectItem value="personal" className="hover:bg-warning/5">
                    <div className="flex items-center">
                      <Icon name="lucide:User" className="w-4 h-4 mr-2 text-ezbill-client" />
                      Personal (your name)
                    </div>
                  </SelectItem>
                  {companies?.map(company => (
                    <SelectItem
                      key={company._id}
                      value={company._id}
                      className="hover:bg-warning/5"
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
              <Label className="text-sm font-medium  mb-3 block flex items-center">
                <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2 text-ezbill-quote" />
                Currency
              </Label>
              <Select
                value={formData.currency}
                onValueChange={(value: Currency) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-warning focus:border-warning transition-all duration-200 shadow-sm hover:shadow-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-xl rounded-xl">
                  {currencies.map(({ value, label, symbol }) => (
                    <SelectItem key={value} value={value} className="hover:bg-warning/5">
                      <div className="flex items-center">
                        {label}
                        <Span className="ml-2 text-warning">
                          {symbol}
                        </Span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium  mb-3 block flex items-center">
                <Icon name="lucide:Calendar" className="w-4 h-4 mr-2 text-ezbill-quote" />
                Valid Until
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
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
                    className="border-warning/50 text-amber-600 focus:ring-amber-500"
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
                      step="1"
                      value={formData.taxRate}
                      onChange={e =>
                        setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-warning focus:border-warning transition-all duration-200 shadow-sm hover:shadow-md"
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
                <div className="bg-card/60 backdrop-blur-sm rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Table className="w-full min-w-[600px]">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-warning/10 to-warning/5">
                        <TableHead className="font-semibold ">
                          <div className="flex items-center">
                            <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
                            Description
                          </div>
                        </TableHead>
                        <TableHead className="w-20 font-semibold ">
                          <div className="flex items-center">
                            <Icon name="lucide:Hash" className="w-4 h-4 mr-2" />
                            Qty
                          </div>
                        </TableHead>
                        <TableHead className="w-24 font-semibold ">
                          <div className="flex items-center">
                            <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2" />
                            Price
                          </div>
                        </TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items?.map((item, index) => (
                        <TableRow key={index} className="hover:bg-warning/5">
                          <TableCell className="p-3">
                            <Input
                              placeholder="Description"
                              value={item.label}
                              onChange={e => updateLineItem(index, 'label', e.target.value)}
                              required
                              className="bg-background text-foreground border rounded-lg focus:ring-2 focus:ring-warning focus:border-warning"
                            />
                          </TableCell>
                          <TableCell className="p-3">
                            <Input
                              type="number"
                              placeholder="Qty"
                              min="1"
                              value={item.quantity}
                              onChange={e =>
                                updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)
                              }
                              required
                              className="bg-background text-foreground border rounded-lg focus:ring-2 focus:ring-warning focus:border-warning"
                            />
                          </TableCell>
                          <TableCell className="p-3">
                            <Input
                              type="number"
                              placeholder="Price"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={e =>
                                updateLineItem(index, 'price', parseFloat(e.target.value) || 0)
                              }
                              required
                              className="bg-background text-foreground border rounded-lg focus:ring-2 focus:ring-warning focus:border-warning"
                            />
                          </TableCell>
                          <TableCell className="p-3">
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
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
          <div className="">
            <div className="flex items-center mb-3">
              <Icon name="lucide:Calculator" className="w-4 h-4 mr-2" />
              <h4 className="font-semibold ">Quote Summary</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm bg-muted/40 backdrop-blur-sm rounded-lg p-2">
                <span className="font-medium ">Subtotal:</span>
                <span className="font-semibold">
                  {subtotal.toFixed(2)} {formData.currency}
                </span>
              </div>
              {showTaxes && (
                <div className="flex justify-between text-sm bg-muted/40 backdrop-blur-sm rounded-lg p-2">
                  <span className="font-medium ">Tax ({formData.taxRate}%):</span>
                  <span className="font-semibold">
                    {taxAmount.toFixed(2)} {formData.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between bg-gradient-quote text-white rounded-lg p-3 shadow">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-lg">
                  {total.toFixed(2)} {formData.currency}
                </span>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium  mb-3 block flex items-center">
              <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
              Notes
            </Label>
            <TextArea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-warning focus:border-warning transition-all duration-200 shadow-sm hover:shadow-md resize-none"
              placeholder="Additional notes for this quote..."
            />
          </div>

          <div>
            <Label className="text-sm font-medium  mb-3 block flex items-center">
              <Icon name="lucide:FileCheck" className="w-4 h-4 mr-2 " />
              Terms & Conditions
            </Label>
            <TextArea
              value={formData.terms}
              onChange={e => setFormData({ ...formData, terms: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-warning focus:border-warning transition-all duration-200 shadow-sm hover:shadow-md resize-none"
              placeholder="Quote terms and conditions..."
            />
          </div>
        </form>
        </div>

        {/* AI Assistant Sidebar (when expanded) */}
        {showAIAssistant && (
          <div className="w-full lg:w-1/3 h-[400px] lg:h-[600px] mt-4 lg:mt-0">
            <InvoiceAIAssistant
              isCollapsed={false}
              onToggle={() => setShowAIAssistant(false)}
              onDataExtracted={handleAIExtraction}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
