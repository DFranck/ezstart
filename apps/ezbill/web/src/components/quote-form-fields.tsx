'use client'

import { BaseLineItem, BillingType, Currency } from '@ezbill/types'
import {
  Button,
  Checkbox,
  Icon,
  Input,
  Label,
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
  Textarea,
  Div,
  H4,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

const currencies: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
]

/* ── Itemized Items Table ── */
interface ItemsTableProps {
  items: BaseLineItem[]
  onUpdateItem: (index: number, field: keyof BaseLineItem, value: string | number) => void
  onRemoveItem: (index: number) => void
  onAddItem: () => void
}

export function ItemsTable({ items, onUpdateItem, onRemoveItem, onAddItem }: ItemsTableProps) {
  const tCommon = useTranslations('common')
  return (
    <>
      <Div className="bg-card/60 backdrop-blur-sm rounded-xl border overflow-hidden">
        <Div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table className="w-full min-w-[600px]">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-warning/10 to-warning/5">
                <TableHead className="font-semibold ">
                  <Div className="flex items-center">
                    <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
                    {tCommon('description')}
                  </Div>
                </TableHead>
                <TableHead className="w-20 font-semibold ">
                  <Div className="flex items-center">
                    <Icon name="lucide:Hash" className="w-4 h-4 mr-2" />
                    {tCommon('quantity')}
                  </Div>
                </TableHead>
                <TableHead className="w-24 font-semibold ">
                  <Div className="flex items-center">
                    <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2" />
                    {tCommon('price')}
                  </Div>
                </TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index} className="hover:bg-warning/5">
                  <TableCell className="p-3">
                    <Textarea
                      placeholder={tCommon('description')}
                      value={item.label}
                      onChange={e => onUpdateItem(index, 'label', e.target.value)}
                      required
                      rows={3}
                      className="bg-background text-foreground border rounded-lg focus:ring-2 focus:ring-warning focus:border-warning resize-y min-h-[60px]"
                    />
                  </TableCell>
                  <TableCell className="p-3">
                    <Input
                      type="number"
                      placeholder={tCommon('quantity')}
                      min="1"
                      value={item.quantity}
                      onChange={e => onUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      required
                      className="bg-background text-foreground border rounded-lg focus:ring-2 focus:ring-warning focus:border-warning"
                    />
                  </TableCell>
                  <TableCell className="p-3">
                    <Input
                      type="number"
                      placeholder={tCommon('price')}
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={e => onUpdateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      required
                      className="bg-background text-foreground border rounded-lg focus:ring-2 focus:ring-warning focus:border-warning"
                    />
                  </TableCell>
                  <TableCell className="p-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={() => onRemoveItem(index)}
                      disabled={items.length <= 1}
                      aria-label="Remove line item"
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
      <Button type="button" variant="outline" className="mt-2" onClick={onAddItem}>
        <Icon name="lucide:Plus" className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
        {tCommon('addLineItem')}
      </Button>
    </>
  )
}

/* ── Quote Summary ── */
interface QuoteSummaryProps {
  subtotal: number
  taxAmount: number
  total: number
  showTaxes: boolean
  taxRate: number
  currency: Currency
}

export function QuoteSummary({
  subtotal,
  taxAmount,
  total,
  showTaxes,
  taxRate,
  currency,
}: QuoteSummaryProps) {
  const tCommon = useTranslations('common')
  const tQuote = useTranslations('quote')
  return (
    <Div>
      <Div className="flex items-center mb-3">
        <Icon name="lucide:Calculator" className="w-4 h-4 mr-2" />
        <H4 className="font-semibold ">{tQuote('summary')}</H4>
      </Div>
      <Div className="space-y-2">
        <Div className="flex justify-between text-sm bg-muted/40 backdrop-blur-sm rounded-lg p-2">
          <Span className="font-medium ">{tCommon('subtotal')}:</Span>
          <Span className="font-semibold">
            {subtotal.toFixed(2)} {currency}
          </Span>
        </Div>
        {showTaxes && (
          <Div className="flex justify-between text-sm bg-muted/40 backdrop-blur-sm rounded-lg p-2">
            <Span className="font-medium ">{tCommon('tax', { rate: taxRate })}:</Span>
            <Span className="font-semibold">
              {taxAmount.toFixed(2)} {currency}
            </Span>
          </Div>
        )}
        <Div className="flex justify-between bg-gradient-quote text-white rounded-lg p-3 shadow">
          <Span className="font-bold">{tCommon('total')}:</Span>
          <Span className="font-bold text-lg">
            {total.toFixed(2)} {currency}
          </Span>
        </Div>
      </Div>
    </Div>
  )
}
