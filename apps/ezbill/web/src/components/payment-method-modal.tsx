'use client'

import { CreatePaymentMethod, PaymentMethod, PaymentMethodType } from '@ezbill/types'
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
import { callApi, runWithFeedback } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import { getUserId } from '../utils/get-user-id'
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
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<CreatePaymentMethod>({
    userId: '',
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
      userId: '',
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
  }, [paymentMethod])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Auto-generate name from type
    const selectedType = paymentMethodTypes.find(t => t.value === formData.type)
    const dataToSend = {
      ...formData,
      userId: getUserId(),
      name: selectedType?.label || formData.type,
    }

    return runWithFeedback({
      action: async () => {
        if (paymentMethod) {
          const res = await callApi(`/payment-methods/${paymentMethod._id}`, {
            method: 'PUT',
            userId: getUserId(),
            body: dataToSend,
          })
          if (!res.ok) throw new Error('Failed to update payment method')
        } else {
          const res = await callApi('/payment-methods', {
            method: 'POST',
            userId: getUserId(),
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
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-success" />
                Bank Name
              </Label>
              <Input
                value={formData.bankName || ''}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="JPMorgan Chase, BNP Paribas..."
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Hash" className="w-4 h-4 mr-2 text-success" />
                Account Number
              </Label>
              <Input
                value={formData.accountNumber || ''}
                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="1234567890"
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:CreditCard" className="w-4 h-4 mr-2 text-success" />
                IBAN
              </Label>
              <Input
                value={formData.iban || ''}
                onChange={e => setFormData({ ...formData, iban: e.target.value })}
                placeholder="FR14 2004 1010 0505 0001 3M02 606"
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Globe" className="w-4 h-4 mr-2 text-success" />
                SWIFT/BIC Code
              </Label>
              <Input
                value={formData.swift || ''}
                onChange={e => setFormData({ ...formData, swift: e.target.value })}
                placeholder="BNPAFRPP"
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
          </>
        )

      case 'crypto_wallet':
        return (
          <>
            <div className="lg:col-span-2">
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Wallet" className="w-4 h-4 mr-2 text-success" />
                Wallet Address *
              </Label>
              <Input
                value={formData.walletAddress || ''}
                onChange={e => setFormData({ ...formData, walletAddress: e.target.value })}
                placeholder="cosmos1abc123def456ghi789jkl012mno345pqr678stu"
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Network" className="w-4 h-4 mr-2 text-success" />
                Network
              </Label>
              <Input
                value={formData.network || ''}
                onChange={e => setFormData({ ...formData, network: e.target.value })}
                placeholder="Cosmos Hub, Ethereum, Bitcoin..."
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Coins" className="w-4 h-4 mr-2 text-success" />
                Currency/Token
              </Label>
              <Input
                value={formData.currency || ''}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                placeholder="USDC, ETH, BTC, ATOM..."
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
          </>
        )

      case 'paypal':
      case 'wise':
      case 'revolut':
        return (
          <div className="lg:col-span-2">
            <Label className="text-sm font-medium mb-3 block flex items-center">
              <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-success" />
              Email Address
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icon name="lucide:Mail" className="w-5 h-5 text-foreground/60 z-10" />
              </div>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full pl-12 focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="lg:col-span-2">
            <Label className="text-sm font-medium mb-3 block flex items-center">
              <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-success" />
              Account Details
            </Label>
            <TextArea
              value={formData.instructions || ''}
              onChange={e => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Enter account details, instructions, or any relevant information..."
              rows={3}
              className="w-full px-4 py-3 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md min-h-[100px] resize-none"
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
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="backdrop-blur-sm hover:bg-white/80 font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Icon name="lucide:X" className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={formData.type === 'crypto_wallet' && !formData.walletAddress}
            form="payment-method-form"
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Icon name={paymentMethod ? 'lucide:Save' : 'lucide:Plus'} className="w-4 h-4 mr-2" />
            {paymentMethod ? 'Update' : 'Add'} Payment Method
          </LoadingButton>
        </div>
      }
    >
      <form
        id="payment-method-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 m-1"
      >
        <div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:Type" className="w-4 h-4 mr-2 text-success" />
            Payment Type *
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value: PaymentMethodType) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center">
                    <Icon name={type.icon} className="w-4 h-4 mr-2 text-success" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-2 border-t border-green-200/50 pt-6 mt-2">
          <div className="flex items-center mb-4">
            <Icon
              name={selectedType?.icon || 'lucide:Settings'}
              className="w-5 h-5 mr-2 text-success"
            />
            <h4 className="text-lg font-semibold ">{selectedType?.label} Details</h4>
          </div>
        </div>
        {renderFieldsForType()}

        <div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-success" />
            Additional Instructions
          </Label>
          <TextArea
            value={formData.instructions || ''}
            onChange={e => setFormData({ ...formData, instructions: e.target.value })}
            placeholder="Any special instructions for payments..."
            rows={2}
            className="w-full px-4 py-3 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md min-h-[80px] resize-none"
          />
        </div>

        <div className="lg:col-span-2">
          <div className="p-4 border rounded-md">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, isDefault: checked })
                }
                className="border-green-300 text-success focus:ring-success"
              />
              <Label
                htmlFor="isDefault"
                className="text-sm font-medium flex items-center cursor-pointer"
              >
                <Icon name="lucide:Star" className="w-4 h-4 mr-2 text-success" />
                Make this my default payment method
              </Label>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
