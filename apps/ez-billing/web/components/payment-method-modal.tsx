'use client'

import { useUserStore } from '@/stores/useUserStore'
import { CreatePaymentMethod, PaymentMethod, PaymentMethodType } from '@ez-billing/types'
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
  TextArea,
} from '@ezstart/ui/components'
import { runWithFeedback } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import { callBillingApi } from '../utils/call-billing-api'
import { LoadingButton } from './loading-button'

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  paymentMethod?: PaymentMethod
  onSave: () => void
}

const paymentMethodTypes = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'lucide:Building' },
  { value: 'crypto_wallet', label: 'Crypto Wallet', icon: 'lucide:Wallet' },
  { value: 'paypal', label: 'PayPal', icon: 'lucide:CreditCard' },
  { value: 'stripe', label: 'Stripe', icon: 'lucide:CreditCard' },
  { value: 'wise', label: 'Wise (TransferWise)', icon: 'lucide:Send' },
  { value: 'revolut', label: 'Revolut', icon: 'lucide:Smartphone' },
  { value: 'other', label: 'Other', icon: 'lucide:MoreHorizontal' },
] as const

export function PaymentMethodModal({
  isOpen,
  onClose,
  paymentMethod,
  onSave,
}: PaymentMethodModalProps) {
  const { user } = useUserStore()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<CreatePaymentMethod>({
    userId: user?._id || '',
    name: '',
    type: paymentMethod?.type || 'bank_transfer',
    bankName: paymentMethod?.bankName || '',
    accountNumber: paymentMethod?.accountNumber || '',
    routingNumber: paymentMethod?.routingNumber || '',
    iban: paymentMethod?.iban || '',
    swift: paymentMethod?.swift || '',
    walletAddress: paymentMethod?.walletAddress || '',
    network: paymentMethod?.network || '',
    currency: paymentMethod?.currency || '',
    email: paymentMethod?.email || '',
    username: paymentMethod?.username || '',
    instructions: paymentMethod?.instructions || '',
    isDefault: paymentMethod?.isDefault || false,
  })

  // Update form data when paymentMethod changes
  useEffect(() => {
    const selectedType = paymentMethodTypes.find(
      t => t.value === (paymentMethod?.type || 'bank_transfer')
    )
    setFormData({
      userId: user?._id || '',
      name: selectedType?.label || '',
      type: paymentMethod?.type || 'bank_transfer',
      bankName: paymentMethod?.bankName || '',
      accountNumber: paymentMethod?.accountNumber || '',
      routingNumber: paymentMethod?.routingNumber || '',
      iban: paymentMethod?.iban || '',
      swift: paymentMethod?.swift || '',
      walletAddress: paymentMethod?.walletAddress || '',
      network: paymentMethod?.network || '',
      currency: paymentMethod?.currency || '',
      email: paymentMethod?.email || '',
      username: paymentMethod?.username || '',
      instructions: paymentMethod?.instructions || '',
      isDefault: paymentMethod?.isDefault || false,
    })
  }, [paymentMethod, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Auto-generate name from type
    const selectedType = paymentMethodTypes.find(t => t.value === formData.type)
    const dataToSend = {
      ...formData,
      userId: user._id,
      name: selectedType?.label || formData.type,
    }

    return runWithFeedback({
      action: async () => {
        if (paymentMethod) {
          const res = await callBillingApi(`/payment-methods/${paymentMethod._id}`, {
            method: 'PUT',
            body: dataToSend,
          })
          if (!res.ok) throw new Error('Failed to update payment method')
        } else {
          const res = await callBillingApi('/payment-methods', {
            method: 'POST',
            body: dataToSend,
          })
          if (!res.ok) throw new Error('Failed to create payment method')
        }
        onSave()
        onClose()
      },
      toastLoading: {
        message: paymentMethod ? 'Updating payment method...' : 'Creating payment method...',
      },
      toastSuccess: {
        message: paymentMethod ? 'Payment method updated' : 'Payment method created',
      },
      toastError: {
        message: paymentMethod
          ? 'Failed to update payment method'
          : 'Failed to create payment method',
      },
      onLoadingChange: setIsLoading,
    })
  }

  const selectedType = paymentMethodTypes.find(t => t.value === formData.type)

  // Update name automatically when type changes
  useEffect(() => {
    const selectedType = paymentMethodTypes.find(t => t.value === formData.type)
    if (selectedType) {
      setFormData(prev => ({ ...prev, name: selectedType.label }))
    }
  }, [formData.type])

  const renderFieldsForType = () => {
    switch (formData.type) {
      case 'bank_transfer':
        return (
          <>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Bank Name</Label>
              <Input
                value={formData.bankName || ''}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="JPMorgan Chase, BNP Paribas..."
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Account Number</Label>
              <Input
                value={formData.accountNumber || ''}
                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="1234567890"
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">IBAN</Label>
              <Input
                value={formData.iban || ''}
                onChange={e => setFormData({ ...formData, iban: e.target.value })}
                placeholder="FR14 2004 1010 0505 0001 3M02 606"
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">SWIFT/BIC Code</Label>
              <Input
                value={formData.swift || ''}
                onChange={e => setFormData({ ...formData, swift: e.target.value })}
                placeholder="BNPAFRPP"
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
              />
            </div>
          </>
        )

      case 'crypto_wallet':
        return (
          <>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Wallet Address *
              </Label>
              <Input
                value={formData.walletAddress || ''}
                onChange={e => setFormData({ ...formData, walletAddress: e.target.value })}
                placeholder="cosmos1abc123def456ghi789jkl012mno345pqr678stu"
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Network</Label>
              <Input
                value={formData.network || ''}
                onChange={e => setFormData({ ...formData, network: e.target.value })}
                placeholder="Cosmos Hub, Ethereum, Bitcoin..."
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Currency/Token</Label>
              <Input
                value={formData.currency || ''}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                placeholder="USDC, ETH, BTC, ATOM..."
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
              />
            </div>
          </>
        )

      case 'paypal':
      case 'wise':
      case 'revolut':
        return (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Email Address</Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
            />
          </div>
        )

      default:
        return (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Account Details</Label>
            <TextArea
              value={formData.instructions || ''}
              onChange={e => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Enter account details, instructions, or any relevant information..."
              rows={3}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
            />
          </div>
        )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paymentMethod ? 'Edit Payment Method' : 'Add Payment Method'}
      description="Configure how you want to receive payments from your clients"
      footer={
        <div className="flex gap-3 justify-end bg-white/70 backdrop-blur-sm border-t border-white/20 p-6 -m-6 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-white/60 backdrop-blur-sm border-white/30 text-gray-700 hover:bg-white/80"
          >
            <Icon name="lucide:X" className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={formData.type === 'crypto_wallet' && !formData.walletAddress}
            form="payment-method-form"
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
          >
            <Icon name={paymentMethod ? 'lucide:Save' : 'lucide:Plus'} className="w-4 h-4 mr-2" />
            {paymentMethod ? 'Update' : 'Add'} Payment Method
          </LoadingButton>
        </div>
      }
    >
      <div className="bg-gradient-to-br from-green-50/50 via-white to-emerald-50/50 rounded-2xl p-6 border border-white/20">
        <form id="payment-method-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
              <Icon name="lucide:Type" className="w-4 h-4 mr-2 text-green-500" />
              Payment Type *
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: PaymentMethodType) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center">
                      <Icon name={type.icon} className="w-4 h-4 mr-2 text-green-500" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Icon
                name={selectedType?.icon || 'lucide:Settings'}
                className="w-5 h-5 mr-2 text-green-500"
              />
              {selectedType?.label} Details
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{renderFieldsForType()}</div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Additional Instructions
            </Label>
            <TextArea
              value={formData.instructions || ''}
              onChange={e => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Any special instructions for payments..."
              rows={2}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl"
            />
          </div>

          <div className="bg-green-50/50 backdrop-blur-sm rounded-xl p-4 border border-green-200/30">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, isDefault: checked })
                }
                className="border-green-300 text-green-600 focus:ring-green-500"
              />
              <Label
                htmlFor="isDefault"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                <Icon name="lucide:Star" className="w-4 h-4 mr-2 text-green-500 inline" />
                Make this my default payment method
              </Label>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}
