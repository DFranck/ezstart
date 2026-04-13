'use client'

import { Icon, Label, Textarea, Div, H3, Span } from '@ezstart/ui/components'
import { CreateInvoice } from '@ezbill/types'

interface InvoiceSummaryProps {
  formData: CreateInvoice & { paymentMethodIds?: string[] }
  setFormData: (data: CreateInvoice & { paymentMethodIds?: string[] }) => void
  showTaxes: boolean
  subtotal: number
  taxAmount: number
  total: number
}

export function InvoiceSummary({
  formData,
  setFormData,
  showTaxes,
  subtotal,
  taxAmount,
  total,
}: InvoiceSummaryProps) {
  return (
    <>
      {/* Totals */}
      <Div>
        <Div className="flex items-center mb-4">
          <Icon name="lucide:Calculator" className="w-5 h-5 mr-2 text-primary" />
          <H3 className="text-lg font-semibold ">Invoice Summary</H3>
        </Div>
        <Div className="space-y-3">
          <Div className="flex justify-between items-center text-sm bg-muted/40 backdrop-blur-sm rounded-lg p-3">
            <Span className="flex items-center font-medium ">
              <Icon name="lucide:Minus" className="w-4 h-4 mr-2" />
              Subtotal:
            </Span>
            <Span className="font-semibold ">
              {subtotal.toFixed(2)} {formData.currency}
            </Span>
          </Div>
          {showTaxes && (
            <Div className="flex justify-between items-center text-sm bg-muted/40 backdrop-blur-sm rounded-lg p-3">
              <Span className="flex items-center font-medium ">
                <Icon name="lucide:Percent" className="w-4 h-4 mr-2" />
                Tax ({formData.taxRate}%):
              </Span>
              <Span className="font-semibold ">
                {taxAmount.toFixed(2)} {formData.currency}
              </Span>
            </Div>
          )}
          <Div className="flex justify-between items-center bg-gradient-invoice text-white rounded-lg p-4 shadow-lg">
            <Span className="flex items-center font-bold text-lg">
              <Icon name="lucide:DollarSign" className="w-5 h-5 mr-2" />
              Total:
            </Span>
            <Span className="font-bold text-xl">
              {total.toFixed(2)} {formData.currency}
            </Span>
          </Div>
        </Div>
      </Div>

      <Div>
        <Label className="text-sm font-medium  mb-3 block flex items-center">
          <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-primary" />
          Notes
        </Label>
        <Textarea
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md resize-none"
          placeholder="Additional notes for this invoice..."
        />
      </Div>

      <Div>
        <Label className="text-sm font-medium  mb-3 block flex items-center">
          <Icon name="lucide:FileCheck" className="w-4 h-4 mr-2 text-primary" />
          Terms & Conditions
        </Label>
        <Textarea
          value={formData.terms}
          onChange={e => setFormData({ ...formData, terms: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md resize-none"
          placeholder="Payment due upon receipt. Late payment penalties may apply..."
        />
      </Div>
    </>
  )
}
