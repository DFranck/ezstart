'use client'

import { callApi, parseApiError, runWithFeedback } from '@/config/api'
import { PaymentMethod, PaymentMethodType } from '@ezbill/types'
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
  Div,
  H4,
  P,
} from '@ezstart/ui/components'
import { useAuth } from '@ezstart/auth-sdk'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LoadingButton } from './loading-button'

// Bank region types
type BankRegion = 'international' | 'domestic'

// Flexible form state (all fields optional during editing)
type PaymentMethodFormData = {
  userId: string
  name: string
  type: PaymentMethodType
  isDefault: boolean
  instructions?: string
  // Bank transfer fields
  bankRegion?: BankRegion // Helper field for UX
  iban?: string
  swift?: string
  bankName?: string
  accountNumber?: string
  routingNumber?: string
  // Crypto fields
  walletAddress?: string
  network?: string
  currency?: string
}

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  paymentMethod?: PaymentMethod
  onSave: () => void
}

const paymentMethodTypes = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'lucide:Building' },
  { value: 'crypto_wallet', label: 'Crypto Wallet', icon: 'lucide:Wallet' },
  { value: 'cash', label: 'Cash', icon: 'lucide:Banknote' },
] as const

export function PaymentMethodModal({
  isOpen,
  onClose,
  paymentMethod,
  onSave,
}: PaymentMethodModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const tToast = useTranslations('toast')
  const tPM = useTranslations('paymentMethod')
  const tCommon = useTranslations('common')

  const [formData, setFormData] = useState<PaymentMethodFormData>({
    userId: '',
    name: '',
    type: paymentMethod?.type || 'bank_transfer',
    isDefault: paymentMethod?.isDefault || false,
    instructions: paymentMethod?.instructions || '',
    // Bank transfer - always set defaults for new payment methods
    bankRegion:
      paymentMethod?.type === 'bank_transfer' && paymentMethod.iban
        ? 'international'
        : 'international', // Default to international
    ...(paymentMethod?.type === 'bank_transfer' && {
      bankName: paymentMethod.bankName,
      iban: paymentMethod.iban,
      swift: paymentMethod.swift,
      accountNumber: paymentMethod.accountNumber,
      routingNumber: paymentMethod.routingNumber,
    }),
    // Crypto
    ...(paymentMethod?.type === 'crypto_wallet' && {
      walletAddress: paymentMethod.walletAddress,
      network: paymentMethod.network,
      currency: paymentMethod.currency,
    }),
  })

  // Update form data when paymentMethod changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const selectedType = paymentMethodTypes.find(
        t => t.value === (paymentMethod?.type || 'bank_transfer')
      )
      setFormData({
        userId: '',
        name: selectedType?.label || '',
        type: paymentMethod?.type || 'bank_transfer',
        isDefault: paymentMethod?.isDefault || false,
        instructions: paymentMethod?.instructions || '',
        // Bank transfer - always set defaults
        bankRegion:
          paymentMethod?.type === 'bank_transfer' && paymentMethod.iban
            ? 'international'
            : 'international', // Default to international
        ...(paymentMethod?.type === 'bank_transfer' && {
          bankName: paymentMethod.bankName,
          iban: paymentMethod.iban,
          swift: paymentMethod.swift,
          accountNumber: paymentMethod.accountNumber,
          routingNumber: paymentMethod.routingNumber,
        }),
        // Crypto
        ...(paymentMethod?.type === 'crypto_wallet' && {
          walletAddress: paymentMethod.walletAddress,
          network: paymentMethod.network,
          currency: paymentMethod.currency,
        }),
      })
    }
  }, [paymentMethod, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation: Check if IBAN or Account Number is provided for bank transfer
    if (formData.type === 'bank_transfer') {
      if (!formData.iban && !formData.accountNumber) {
        // This will be caught by the toast
        throw new Error('Either IBAN or Account Number is required for bank transfers')
      }
    }

    // Auto-generate name from type
    const selectedType = paymentMethodTypes.find(t => t.value === formData.type)

    // Remove bankRegion and build clean data
    const { bankRegion, ...baseData } = formData

    // Clean up bank transfer fields based on region
    let cleanData: any = { ...baseData }
    if (formData.type === 'bank_transfer' && bankRegion) {
      if (bankRegion === 'international') {
        // Keep IBAN/SWIFT only (remove spaces from IBAN)
        cleanData = {
          type: formData.type,
          isDefault: formData.isDefault,
          instructions: formData.instructions,
          bankName: formData.bankName,
          ...(formData.iban && { iban: formData.iban.replace(/\s/g, '') }), // Remove all spaces
          ...(formData.swift && { swift: formData.swift }),
        }
      } else {
        // Keep Account/Routing only
        cleanData = {
          type: formData.type,
          isDefault: formData.isDefault,
          instructions: formData.instructions,
          bankName: formData.bankName,
          ...(formData.accountNumber && { accountNumber: formData.accountNumber }),
          ...(formData.routingNumber && { routingNumber: formData.routingNumber }),
        }
      }
    }

    const dataToSend = {
      ...cleanData,
      userId: user?._id,
      name: selectedType?.label || formData.type,
    }

    return runWithFeedback({
      action: async () => {
        if (paymentMethod) {
          const res = await callApi(`/payment-methods/${paymentMethod._id}`, {
            method: 'PUT',
            userId: user?._id,
            body: dataToSend,
          })
          if (!res.ok) throw new Error(parseApiError(res.data))
        } else {
          const res = await callApi('/payment-methods', {
            method: 'POST',
            userId: user?._id,
            body: dataToSend,
          })
          if (!res.ok) throw new Error(parseApiError(res.data))
        }
        onSave()
        onClose()
      },
      toastLoading: {
        message: paymentMethod ? tToast('paymentMethodUpdating') : tToast('paymentMethodCreating'),
      },
      toastSuccess: {
        message: paymentMethod ? tToast('paymentMethodUpdated') : tToast('paymentMethodCreated'),
      },
      toastError: {
        message: paymentMethod
          ? tToast('paymentMethodUpdateFailed')
          : tToast('paymentMethodCreateFailed'),
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
            <Div className="lg:col-span-2">
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-ezbill-payment" />
                Bank Name *
              </Label>
              <Input
                value={formData.bankName || ''}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="JPMorgan Chase, BNP Paribas..."
              />
            </Div>

            <Div className="lg:col-span-2">
              <Label className="text-sm font-medium mb-3 flex items-center">
                <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-ezbill-payment" />
                Bank Region *
              </Label>
              <Div className="flex gap-3">
                <Button
                  type="button"
                  variant={formData.bankRegion === 'international' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, bankRegion: 'international' })}
                >
                  <Icon name="lucide:Globe" className="w-6 h-6" />
                  <Div className="text-center">
                    <Div className="font-semibold">International</Div>
                    <Div className="text-xs opacity-80">IBAN/SWIFT</Div>
                  </Div>
                </Button>
                <Button
                  type="button"
                  variant={formData.bankRegion === 'domestic' ? 'default' : 'outline'}
                  className="flex-1 h-auto py-4 px-4 flex flex-col items-center gap-2 transition-all duration-200"
                  onClick={() => setFormData({ ...formData, bankRegion: 'domestic' })}
                >
                  <Icon name="lucide:Building" className="w-6 h-6" />
                  <Div className="text-center">
                    <Div className="font-semibold">Domestic</Div>
                    <Div className="text-xs opacity-80">Account/Routing</Div>
                  </Div>
                </Button>
              </Div>
              <P className="text-xs text-muted-foreground mt-2">
                {formData.bankRegion === 'international'
                  ? 'For Europe, Middle East, Africa (SEPA transfers)'
                  : 'For USA, Canada, UK, Asia (local transfers)'}
              </P>
            </Div>

            {formData.bankRegion === 'international' ? (
              <>
                <Div>
                  <Label className="text-sm font-medium mb-3 flex items-center">
                    <Icon name="lucide:CreditCard" className="w-4 h-4 mr-2 text-ezbill-payment" />
                    IBAN *
                  </Label>
                  <Input
                    value={formData.iban || ''}
                    onChange={e => setFormData({ ...formData, iban: e.target.value })}
                    placeholder="FR14 2004 1010 0505 0001 3M02 606"
                    className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md font-mono text-sm"
                  />
                </Div>
                <Div>
                  <Label className="text-sm font-medium mb-3 flex items-center">
                    <Icon name="lucide:Globe" className="w-4 h-4 mr-2 text-ezbill-payment" />
                    SWIFT/BIC Code
                  </Label>
                  <Input
                    value={formData.swift || ''}
                    onChange={e => setFormData({ ...formData, swift: e.target.value })}
                    placeholder="BNPAFRPP"
                    className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </Div>
              </>
            ) : (
              <>
                <Div>
                  <Label className="text-sm font-medium mb-3 flex items-center">
                    <Icon name="lucide:Hash" className="w-4 h-4 mr-2 text-ezbill-payment" />
                    Account Number *
                  </Label>
                  <Input
                    value={formData.accountNumber || ''}
                    onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="1234567890"
                    className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </Div>
                <Div>
                  <Label className="text-sm font-medium mb-3 flex items-center">
                    <Icon name="lucide:Hash" className="w-4 h-4 mr-2 text-ezbill-payment" />
                    Routing/Sort Code
                  </Label>
                  <Input
                    value={formData.routingNumber || ''}
                    onChange={e => setFormData({ ...formData, routingNumber: e.target.value })}
                    placeholder="026009593 (USA) or 12-34-56 (UK)"
                    className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </Div>
              </>
            )}
          </>
        )

      case 'crypto_wallet':
        return (
          <>
            <Div className="lg:col-span-2">
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Wallet" className="w-4 h-4 mr-2 text-ezbill-payment" />
                Wallet Address *
              </Label>
              <Input
                value={formData.walletAddress || ''}
                onChange={e => setFormData({ ...formData, walletAddress: e.target.value })}
                placeholder="cosmos1abc123def456ghi789jkl012mno345pqr678stu"
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md font-mono text-sm"
              />
            </Div>
            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Network" className="w-4 h-4 mr-2 text-ezbill-payment" />
                Network
              </Label>
              <Input
                value={formData.network || ''}
                onChange={e => setFormData({ ...formData, network: e.target.value })}
                placeholder="Cosmos Hub, Ethereum, Bitcoin..."
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </Div>
            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Coins" className="w-4 h-4 mr-2 text-ezbill-payment" />
                Currency/Token
              </Label>
              <Input
                value={formData.currency || ''}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                placeholder="USDC, ETH, BTC, ATOM..."
                className="w-full focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </Div>
          </>
        )

      case 'cash':
        return (
          <Div className="lg:col-span-2">
            <Label className="text-sm font-medium mb-3 block flex items-center">
              <Icon name="lucide:Banknote" className="w-4 h-4 mr-2 text-ezbill-payment" />
              Instructions (Optional)
            </Label>
            <TextArea
              value={formData.instructions || ''}
              onChange={e => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="E.g., Cash payment accepted at office, bring exact change..."
              rows={3}
              className="w-full px-4 py-3 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md min-h-[100px] resize-none"
            />
          </Div>
        )

      default:
        return null
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paymentMethod ? tPM('edit') : tPM('create')}
      description={tPM('description')}
      footer={
        <Div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="hover:bg-muted font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Icon name="lucide:X" className="w-4 h-4 mr-2" />
            {tCommon('cancel')}
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={formData.type === 'crypto_wallet' && !formData.walletAddress}
            form="payment-method-form"
            className="bg-gradient-payment text-white transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Icon name={paymentMethod ? 'lucide:Save' : 'lucide:Plus'} className="w-4 h-4 mr-2" />
            {paymentMethod ? tPM('edit') : tPM('create')}
          </LoadingButton>
        </Div>
      }
    >
      <form
        id="payment-method-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 m-1"
      >
        <Div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:Type" className="w-4 h-4 mr-2 text-ezbill-payment" />
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
                  <Div className="flex items-center">
                    <Icon name={type.icon} className="w-4 h-4 mr-2 text-ezbill-payment" />
                    {type.label}
                  </Div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Div>

        <Div className="lg:col-span-2 border-t border-border pt-6 mt-2">
          <Div className="flex items-center mb-4">
            <Icon
              name={selectedType?.icon || 'lucide:Settings'}
              className="w-5 h-5 mr-2 text-ezbill-payment"
            />
            <H4 className="text-lg font-semibold ">{selectedType?.label} Details</H4>
          </Div>
        </Div>
        {renderFieldsForType()}

        <Div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-ezbill-payment" />
            Additional Instructions
          </Label>
          <TextArea
            value={formData.instructions || ''}
            onChange={e => setFormData({ ...formData, instructions: e.target.value })}
            placeholder="Any special instructions for payments..."
            rows={2}
            className="w-full px-4 py-3 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-success focus:border-success transition-all duration-200 shadow-sm hover:shadow-md min-h-[80px] resize-none"
          />
        </Div>

        <Div className="lg:col-span-2">
          <Div className="p-4 border rounded-md">
            <Div className="flex items-center space-x-3">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, isDefault: checked })
                }
                className="border-green-300 text-ezbill-payment focus:ring-success"
              />
              <Label
                htmlFor="isDefault"
                className="text-sm font-medium flex items-center cursor-pointer"
              >
                <Icon name="lucide:Star" className="w-4 h-4 mr-2 text-ezbill-payment" />
                Make this my default payment method
              </Label>
            </Div>
          </Div>
        </Div>
      </form>
    </Modal>
  )
}
