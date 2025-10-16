'use client'
import {
  BaseLineItem,
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
  H3,
  Icon,
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
import { callApi, runWithFeedback } from '@/utils/api'
import { useEffect, useState } from 'react'
import { getUserId } from '../utils/get-user-id'
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

const currencies: { value: Currency; label: string }[] = [
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
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

  const [formData, setFormData] = useState<CreateInvoice & { paymentMethodId?: string }>({
    userId: '', // Will be set in handleSubmit
    clientId:
      invoice?.clientId || clientId || (clients.length > 0 && clients[0] ? clients[0]._id : ''),
    companyId: invoice?.companyId || '',
    items: invoice?.items?.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })) || [{ label: '', quantity: 1, price: 0 }],
    currency: invoice?.currency || 'USD',
    dueDate: invoice?.dueDate || '',
    notes: invoice?.notes || '',
    terms: invoice?.terms || '',
    taxRate: invoice?.taxRate || 0,
    status: invoice?.status || 'draft',
    paymentMethodId: paymentMethods?.find(p => p.isDefault)?._id || '',
  })

  // Update form data when invoice changes
  useEffect(() => {
    setFormData({
      userId: '', // Will be set in handleSubmit
      clientId:
        invoice?.clientId || clientId || (clients.length > 0 && clients[0] ? clients[0]._id : ''),
      companyId: invoice?.companyId || '',
      items: invoice?.items?.map(item => ({
        label: item.label,
        quantity: item.quantity,
        price: item.price,
      })) || [{ label: '', quantity: 1, price: 0 }],
      currency: invoice?.currency || 'USD',
      dueDate: invoice?.dueDate || '',
      notes: invoice?.notes || '',
      terms: invoice?.terms || '',
      taxRate: invoice?.taxRate || 0,
      status: invoice?.status || 'draft',
      paymentMethodId: paymentMethods?.find(p => p.isDefault)?._id || '',
    })
    setShowTaxes(invoice?.taxRate ? invoice.taxRate > 0 : false)
  }, [invoice, clientId, clients, paymentMethods])

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { label: '', quantity: 1, price: 0 }],
    })
  }

  const updateLineItem = (index: number, field: keyof BaseLineItem, value: any) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    } as BaseLineItem
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
          if (!res.ok) throw new Error('Failed to update invoice')
        } else {
          const res = await callApi('/invoices', {
            method: 'POST',
            userId: getUserId(),
            body: dataToSend,
          })
          if (!res.ok) throw new Error('Failed to create invoice')
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
      title={invoice ? 'Edit Invoice' : 'Create Invoice'}
      description={invoice ? 'Update invoice information' : 'Create a new invoice for your client'}
      footer={
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-card border  hover:bg-muted font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Icon name="lucide:X" className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={!formData.clientId || formData.items.some(item => !item.label)}
            form="invoice-form"
            className="bg-gradient-company hover:from-indigo-600 hover:to-purple-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Icon name={invoice ? 'lucide:Save' : 'lucide:Plus'} className="w-4 h-4 mr-2" />
            {invoice ? 'Update Invoice' : 'Create Invoice'}
          </LoadingButton>
        </div>
      }
    >
      <div className="">
        <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6 p-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!clientId && (
              <div>
                <Label className="text-sm font-medium  mb-3 block flex items-center">
                  <Icon name="lucide:User" className="w-4 h-4 mr-2 text-primary" />
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
                        <div className="flex items-center">
                          <Icon name="lucide:User" className="w-4 h-4 mr-2 text-primary" />
                          {client.clientName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium  mb-3 block flex items-center">
                <Icon name="lucide:Building2" className="w-4 h-4 mr-2 text-primary" />
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
                      <Icon name="lucide:User" className="w-4 h-4 mr-2 text-success" />
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
                        <Icon name="lucide:Building2" className="w-4 h-4 mr-2 text-accent" />
                        {company.companyName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium  mb-3 block flex items-center">
                <Icon name="lucide:CreditCard" className="w-4 h-4 mr-2 text-primary" />
                Payment Method
              </Label>
              {paymentMethods && paymentMethods.length > 0 ? (
                <Select
                  value={formData.paymentMethodId || ''}
                  onValueChange={value => setFormData({ ...formData, paymentMethodId: value })}
                >
                  <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-xl rounded-xl">
                    {paymentMethods.map(method => (
                      <SelectItem
                        key={method._id}
                        value={method._id}
                        className="hover:bg-primary/5"
                      >
                        <div className="flex items-center">
                          <Icon
                            name={
                              method.type === 'crypto_wallet'
                                ? 'lucide:Wallet'
                                : method.type === 'bank_transfer'
                                  ? 'lucide:Building'
                                  : method.type === 'paypal'
                                    ? 'lucide:CreditCard'
                                    : 'lucide:CreditCard'
                            }
                            className="w-4 h-4 mr-2 text-success"
                          />
                          {method.name}
                          {method.isDefault && (
                            <span className="ml-2 text-xs text-success">(Default)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        <Icon name="lucide:Plus" className="w-4 h-4 mr-1" />
                        Add Method
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium  mb-3 block flex items-center">
                <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2 text-primary" />
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
                  {currencies.map(({ value, label }) => (
                    <SelectItem key={value} value={value} className="hover:bg-primary/5">
                      <div className="flex items-center">
                        <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2 text-warning" />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium  mb-3 block flex items-center">
                <Icon name="lucide:Calendar" className="w-4 h-4 mr-2 text-primary" />
                Due Date
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon name="lucide:Calendar" className="w-5 h-5 text-muted-foreground/60" />
                </div>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
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
            <div className="flex items-center mb-6">
              <Icon name="lucide:List" className="w-5 h-5 mr-2 text-accent" />
              <H3 className="text-xl font-bold ">Line Items</H3>
            </div>
            <div className=" rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold ">
                      <div className="flex items-center">
                        <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
                        Description
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold ">
                      <div className="flex items-center">
                        <Icon name="lucide:Hash" className="w-4 h-4 mr-2" />
                        Qty
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold ">
                      <div className="flex items-center">
                        <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2" />
                        Price
                      </div>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index} className="hover:bg-primary/5/50">
                      <TableCell className="p-3">
                        <Input
                          placeholder="Description"
                          value={item.label}
                          onChange={e => updateLineItem(index, 'label', e.target.value)}
                          required
                          className="bg-background text-foreground border focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </TableCell>
                      <TableCell className="p-3">
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
                          className="bg-background text-foreground border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </TableCell>
                      <TableCell className="p-3">
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
                          className="bg-background text-foreground border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </TableCell>
                      <TableCell className="p-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeLineItem(index)}
                          className="w-8 h-8 p-0 bg-card border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/50 rounded-lg transition-all"
                          disabled={formData.items.length === 1}
                        >
                          <Icon name="lucide:X" className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addLineItem}
              className="mt-4 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/30 px-4 py-2 rounded-xl transition-all duration-200"
            >
              <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
              Add Line Item
            </Button>
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
              <div className="flex justify-between items-center bg-gradient-company text-white rounded-lg p-4 shadow-lg">
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
    </Modal>
  )
}
