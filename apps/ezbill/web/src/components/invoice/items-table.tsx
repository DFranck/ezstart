'use client'

import { BaseLineItem, BillingType, CreateInvoice } from '@ezbill/types'
import {
  Button,
  Icon,
  Input,
  Label,
  Textarea,
  Div,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ezstart/ui/components'

interface ItemsTableProps {
  formData: CreateInvoice & { paymentMethodIds?: string[] }
  setFormData: (data: CreateInvoice & { paymentMethodIds?: string[] }) => void
}

export function ItemsTable({ formData, setFormData }: ItemsTableProps) {
  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), { label: '', quantity: 1, price: 0 }],
    })
  }

  const updateLineItem = (index: number, field: keyof BaseLineItem, value: string | number) => {
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

  return (
    <Div>
      {/* Billing Type Toggle */}
      <Div className="mb-6">
        <Label className="text-sm font-medium mb-3 block flex items-center">
          <Icon name="lucide:FileType" className="w-4 h-4 mr-2 text-primary" />
          Billing Type *
        </Label>
        <Div className="flex gap-3">
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
        </Div>
      </Div>

      {/* Itemized Mode: Table */}
      {formData.billingType === 'itemized' && (
        <>
          <Div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Div className="rounded-xl overflow-hidden">
              <Table className="w-full min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold ">
                      <Div className="flex items-center">
                        <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
                        Description
                      </Div>
                    </TableHead>
                    <TableHead className="font-semibold w-24">
                      <Div className="flex items-center">
                        <Icon name="lucide:Hash" className="w-4 h-4 mr-2" />
                        Qty
                      </Div>
                    </TableHead>
                    <TableHead className="font-semibold w-28">
                      <Div className="flex items-center">
                        <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2" />
                        Price
                      </Div>
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="min-w-[200px]">
                        <Textarea
                          placeholder="Description"
                          value={item.label}
                          onChange={e => updateLineItem(index, 'label', e.target.value)}
                          required
                          rows={3}
                          className="resize-y min-h-[60px]"
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
            </Div>
          </Div>
          <Button type="button" variant="outline" className="mt-2" onClick={addLineItem}>
            <Icon name="lucide:Plus" className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
            Add Line Item
          </Button>
        </>
      )}

      {/* Flat-Rate Mode: Description + Amount */}
      {formData.billingType === 'flat-rate' && (
        <Div className="space-y-4">
          <Div>
            <Label className="text-sm font-medium mb-3 block flex items-center">
              <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-primary" />
              Description *
            </Label>
            <Textarea
              placeholder="Describe the work or service provided..."
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
              rows={6}
              className="w-full resize-none"
            />
          </Div>
          <Div>
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
          </Div>
        </Div>
      )}
    </Div>
  )
}
