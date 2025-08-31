'use client'

import { BaseLineItem, Client, Company, CreateQuote, Currency, Quote } from '@ez-billing/types'
import {
  Button,
  Checkbox,
  H3,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
} from '@ezstart/ui/components'
import { callApi, runWithFeedback } from '@ezstart/ui/utils'
import { useState } from 'react'
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

const currencies: { value: Currency; label: string }[] = [
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
]

export function QuoteModal({ isOpen, onClose, clients, companies, quote, onSave, clientId }: QuoteModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showTaxes, setShowTaxes] = useState(false)

  const [formData, setFormData] = useState<CreateQuote>({
    clientId:
      quote?.clientId || clientId || (clients.length > 0 && clients[0] ? clients[0]._id : ''),
    items: quote?.items?.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })) || [{ label: '', quantity: 1, price: 0 }],
    currency: quote?.currency || 'USD',
    dueDate: quote?.dueDate || '',
    notes: quote?.notes || '',
    terms: quote?.terms || '',
    taxRate: quote?.taxRate || 0,
    status: quote?.status || 'draft',
    validUntil: quote?.validUntil || '',
  })

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { label: '', quantity: 1, price: 0 }],
    })
  }

  const updateLineItem = (index: number, field: keyof BaseLineItem, value: any) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value } as BaseLineItem
    setFormData({ ...formData, items: updatedItems })
  }

  const removeLineItem = (index: number) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: updatedItems })
    }
  }

  // Calculs
  const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const taxAmount = showTaxes ? (subtotal * (formData.taxRate || 0)) / 100 : 0
  const total = subtotal + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    return runWithFeedback({
      action: async () => {
        if (quote) {
          const res = await callApi(`/quotes/${quote._id}`, {
            method: 'PUT',
            body: formData,
          })
          if (!res.ok) throw new Error('Failed to update quote')
        } else {
          const res = await callApi('/quotes', {
            method: 'POST',
            body: formData,
          })
          if (!res.ok) throw new Error('Failed to create quote')
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
      footer={
        <div>
          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>
                {subtotal.toFixed(2)} {formData.currency}
              </span>
            </div>
            {showTaxes && (
              <div className="flex justify-between text-sm">
                <span>Tax ({formData.taxRate}%):</span>
                <span>
                  {taxAmount.toFixed(2)} {formData.currency}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total:</span>
              <span>
                {total.toFixed(2)} {formData.currency}
              </span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <LoadingButton
              loading={isLoading}
              type="submit"
              disabled={!formData.clientId || formData.items.some(item => !item.label)}
              form="quote-form"
            >
              {quote ? 'Update' : 'Create'}
            </LoadingButton>
          </div>
        </div>
      }
    >
      <form id="quote-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {!clientId && (
            <div>
              <Label>Client</Label>
              <Select
                value={formData.clientId}
                onValueChange={value => setFormData({ ...formData, clientId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value: Currency) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Valid Until</Label>
            <Input
              type="date"
              value={formData.validUntil}
              onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
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
              />
              <Label htmlFor="showTaxes" className="text-sm text-gray-700">
                Prices are excluding taxes (HT)
              </Label>
            </div>
            {showTaxes && (
              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.taxRate}
                  onChange={e =>
                    setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <H3>Line Items</H3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-24">Price</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
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
                      min="1"
                      value={item.quantity}
                      onChange={e =>
                        updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Price"
                      min="0"
                      step="1"
                      value={item.price}
                      onChange={e =>
                        updateLineItem(index, 'price', parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeLineItem(index)}
                      className="w-8 h-8 p-0"
                      disabled={formData.items.length === 1}
                    >
                      ✕
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button type="button" variant="outline" onClick={addLineItem} className="mt-2">
            Add Line Item
          </Button>
        </div>

        <TextArea
          label="Notes"
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />

        <TextArea
          label="Terms"
          value={formData.terms}
          onChange={e => setFormData({ ...formData, terms: e.target.value })}
          rows={3}
        />
      </form>
    </Modal>
  )
}
