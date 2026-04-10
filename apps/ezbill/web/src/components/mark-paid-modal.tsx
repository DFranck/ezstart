'use client'

import { Company, CreateReceipt, Invoice } from '@ezbill/types'
import {
  Button,
  H3,
  Input,
  Label,
  Modal,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TextArea,
  Div,
} from '@ezstart/ui/components'
import { runWithFeedback } from '@ezstart/ui/utils'
import { callApi, parseApiError } from '@/config/api'
import { useAuth } from '@ezstart/auth-sdk'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LoadingButton } from './loading-button'

interface MarkPaidModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: Invoice
  companies: Company[]
  onSave: () => void
}

export function MarkPaidModal({ isOpen, onClose, invoice, companies, onSave }: MarkPaidModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const tMarkPaid = useTranslations('markPaid')
  const tCommon = useTranslations('common')
  const tToast = useTranslations('toast')

  const [formData, setFormData] = useState<CreateReceipt & { paymentDate?: string }>({
    userId: '',
    clientId: invoice.clientId,
    companyId: invoice.companyId || '',
    billingType: invoice.billingType || 'itemized',
    items: invoice.items?.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })),
    description: invoice.description,
    flatRateAmount: invoice.flatRateAmount,
    currency: invoice.currency,
    notes: `Payment received for invoice ${invoice.documentNumber}`,
    terms: '',
    taxRate: invoice.taxRate,
    paymentDate: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    return runWithFeedback({
      action: async () => {
        // Use the dedicated mark-paid endpoint that handles both invoice update and receipt creation
        const markPaidRes = await callApi(`/invoices/${invoice._id}/mark-paid`, {
          method: 'POST',
          userId: user?._id,
          body: {
            companyId: formData.companyId,
            paymentDate: formData.paymentDate,
            notes: formData.notes,
          },
        })
        if (!markPaidRes.ok) throw new Error(parseApiError(markPaidRes.data))

        onSave()
        onClose()
      },
      toastLoading: { message: tToast('markPaidLoading') },
      toastSuccess: { message: tToast('markPaidSuccess') },
      toastError: { message: tToast('markPaidFailed') },
      onLoadingChange: setIsLoading,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tMarkPaid('title')}
      description={tMarkPaid('description')}
      footer={
        <Div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {tCommon('cancel')}
          </Button>
          <LoadingButton loading={isLoading} type="submit" form="mark-paid-form">
            {tMarkPaid('markAsPaid')}
          </LoadingButton>
        </Div>
      }
    >
      <form id="mark-paid-form" onSubmit={handleSubmit} className="space-y-4">
        <Div>
          <Label>{tCommon('billOnBehalf')}</Label>
          <Select
            value={formData.companyId || 'personal'}
            onValueChange={value =>
              setFormData({ ...formData, companyId: value === 'personal' ? '' : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={tCommon('selectBillingEntity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">{tCommon('personalName')}</SelectItem>
              {companies?.map(company => (
                <SelectItem key={company._id} value={company._id}>
                  {company.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Div>

        <Div>
          <Label>{tMarkPaid('paymentDate')}</Label>
          <Input
            type="date"
            value={formData.paymentDate}
            onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
            required
          />
        </Div>

        <Div>
          <Label>{tCommon('notes')}</Label>
          <TextArea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </Div>
      </form>
    </Modal>
  )
}
