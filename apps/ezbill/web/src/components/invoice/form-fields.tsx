'use client'

import {
  BaseLineItem,
  BillingType,
  Client,
  Company,
  CreateInvoice,
  Currency,
  PaymentMethod,
} from '@ezbill/types'
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
  Span,
  Div,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

const currencies: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
]

interface FormFieldsProps {
  formData: CreateInvoice & { paymentMethodIds?: string[] }
  setFormData: (data: CreateInvoice & { paymentMethodIds?: string[] }) => void
  clients: Client[]
  companies: Company[]
  paymentMethods: PaymentMethod[]
  showTaxes: boolean
  setShowTaxes: (show: boolean) => void
  showAIAssistant: boolean
  clientId?: string
  onManagePaymentMethods?: () => void
}

export function FormFields({
  formData,
  setFormData,
  clients,
  companies,
  paymentMethods,
  showTaxes,
  setShowTaxes,
  showAIAssistant,
  clientId,
  onManagePaymentMethods,
}: FormFieldsProps) {
  const tCommon = useTranslations('common')
  const tPM = useTranslations('paymentMethod')

  return (
    <Div className={`grid gap-6 ${showAIAssistant ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      {!clientId && (
        <Div>
          <Label className="text-sm font-medium  mb-3 block flex items-center">
            <Icon name="lucide:User" className="w-4 h-4 mr-2 text-ezbill-client" />
            Client *
          </Label>
          <Select
            value={formData.clientId}
            onValueChange={value => setFormData({ ...formData, clientId: value })}
            required
          >
            <SelectTrigger className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
              <SelectValue placeholder={tCommon('selectClient')} />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-xl rounded-xl">
              {clients.map(client => (
                <SelectItem key={client._id} value={client._id} className="hover:bg-primary/5">
                  <Div className="flex items-center">{client.clientName}</Div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Div>
      )}

      <Div>
        <Label className="text-sm font-medium  mb-3 block flex items-center">
          <Icon name="lucide:Building2" className="w-4 h-4 mr-2 text-ezbill-company" />
          {tCommon('billOnBehalf')}
        </Label>
        <Select
          value={formData.companyId || 'personal'}
          onValueChange={value =>
            setFormData({ ...formData, companyId: value === 'personal' ? '' : value })
          }
        >
          <SelectTrigger className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
            <SelectValue placeholder={tCommon('selectBillingEntity')} />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-xl rounded-xl">
            <SelectItem value="personal" className="hover:bg-primary/5">
              <Div className="flex items-center">
                <Icon name="lucide:User" className="w-4 h-4 mr-2 text-ezbill-client" />
                {tCommon('personalName')}
              </Div>
            </SelectItem>
            {companies?.map(company => (
              <SelectItem key={company._id} value={company._id} className="hover:bg-primary/5">
                <Div className="flex items-center">
                  <Icon name="lucide:Building2" className="w-4 h-4 mr-2 text-ezbill-company" />
                  {company.companyName}
                </Div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Div>

      <Div>
        <Label className="text-sm font-medium mb-3 block flex items-center">
          <Icon name="lucide:CreditCard" className="w-4 h-4 mr-2 text-ezbill-payment" />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- next-intl dynamic key */}
          {tCommon('paymentMethods' as Parameters<typeof tCommon>[0]) || 'Payment Methods'}
        </Label>
        {paymentMethods && paymentMethods.length > 0 ? (
          <Div className="space-y-2 border rounded-lg p-3">
            {paymentMethods.map(method => {
              const isChecked = formData.paymentMethodIds?.includes(method._id) || false
              return (
                <Div key={method._id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`payment-${method._id}`}
                    checked={isChecked}
                    onCheckedChange={(checked: boolean) => {
                      const currentIds = formData.paymentMethodIds || []
                      const newIds = checked
                        ? [...currentIds, method._id]
                        : currentIds.filter(id => id !== method._id)
                      setFormData({ ...formData, paymentMethodIds: newIds })
                    }}
                  />
                  <Label
                    htmlFor={`payment-${method._id}`}
                    className="flex items-center flex-1 cursor-pointer"
                  >
                    <Icon
                      name={
                        method.type === 'crypto_wallet'
                          ? 'lucide:Wallet'
                          : method.type === 'bank_transfer'
                            ? 'lucide:Building'
                            : method.type === 'cash'
                              ? 'lucide:Banknote'
                              : 'lucide:CreditCard'
                      }
                      className="w-4 h-4 mr-2 text-ezbill-payment"
                    />
                    <Span>{method.name}</Span>
                    {method.isDefault && (
                      <Span className="ml-2 text-xs text-success">(Default)</Span>
                    )}
                  </Label>
                </Div>
              )
            })}
          </Div>
        ) : (
          <Div className="bg-warning/5 backdrop-blur-sm rounded-xl p-4 border border-warning/20">
            <Div className="flex items-center justify-between">
              <Div className="flex items-center">
                <Icon name="lucide:AlertCircle" className="w-5 h-5 text-warning mr-2" />
                <Span className="text-sm text-warning">{tPM('noMethods')}</Span>
              </Div>
              {onManagePaymentMethods && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onManagePaymentMethods}
                  className="bg-warning hover:bg-warning/90 text-warning-foreground"
                >
                  <Icon name="lucide:Plus" className="w-5 h-5 sm:w-4 sm:h-4 mr-1" />
                  {tPM('addMethod')}
                </Button>
              )}
            </Div>
          </Div>
        )}
      </Div>

      <Div>
        <Label className="text-sm font-medium  mb-3 block flex items-center">
          <Icon name="lucide:DollarSign" className="w-4 h-4 mr-2 text-warning" />
          Currency
        </Label>
        <Select
          value={formData.currency}
          onValueChange={(value: Currency) => setFormData({ ...formData, currency: value })}
        >
          <SelectTrigger className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-xl rounded-xl">
            {currencies.map(({ value, label, symbol }) => (
              <SelectItem key={value} value={value} className="hover:bg-primary/5">
                <Div className="flex items-center">
                  {label}
                  <Span className="ml-2 text-warning">{symbol}</Span>
                </Div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Div>

      <Div>
        <Label className="text-sm font-medium  mb-3 block flex items-center">
          <Icon name="lucide:Calendar" className="w-4 h-4 mr-2 text-warning" />
          Due Date
        </Label>
        <Div className="relative">
          <Input
            type="date"
            value={formData.dueDate}
            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </Div>
      </Div>

      <Div>
        <Div className="">
          <Div className="flex items-center space-x-3 mb-4">
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
          </Div>
          {showTaxes && (
            <Div>
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
            </Div>
          )}
        </Div>
      </Div>
    </Div>
  )
}
