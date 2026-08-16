'use client'

import { callApi, runWithFeedback } from '@/config/api'
import { BillingClient, Client } from '@ezbill/types'
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
  Textarea,
  Div,
  H4,
  Span,
} from '@ezstart/ui/components'
import { useAuth } from '@ezstart/auth-sdk'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LoadingButton } from './loading-button'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  client?: Client
  onSave: () => void
}

export function ClientModal({ isOpen, onClose, client, onSave }: ClientModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const tToast = useTranslations('toast')
  const tClient = useTranslations('client')
  const tCommon = useTranslations('common')

  const [formData, setFormData] = useState<BillingClient>({
    userId: client?.userId || '',
    clientName: client?.clientName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    isCompany: client?.isCompany || false,
    address: client?.address || '',
    city: client?.city || '',
    postalCode: client?.postalCode || '',
    country: client?.country || '',
    companyRegistrationNumber: client?.companyRegistrationNumber || '',
    taxNumber: client?.taxNumber || '',
    contactPersonName: client?.contactPersonName || '',
    contactPersonEmail: client?.contactPersonEmail || '',
    contactPersonPhone: client?.contactPersonPhone || '',
    contactPersonTitle: client?.contactPersonTitle || '',
    website: client?.website || '',
    notes: client?.notes || '',
  })

  const [showFullAddress, setShowFullAddress] = useState(
    !!(client?.city || client?.postalCode || client?.country)
  )

  // Update form data when client changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        userId: client?.userId || '',
        clientName: client?.clientName || '',
        email: client?.email || '',
        phone: client?.phone || '',
        isCompany: client?.isCompany || false,
        address: client?.address || '',
        city: client?.city || '',
        postalCode: client?.postalCode || '',
        country: client?.country || '',
        companyRegistrationNumber: client?.companyRegistrationNumber || '',
        taxNumber: client?.taxNumber || '',
        contactPersonName: client?.contactPersonName || '',
        contactPersonEmail: client?.contactPersonEmail || '',
        contactPersonPhone: client?.contactPersonPhone || '',
        contactPersonTitle: client?.contactPersonTitle || '',
        website: client?.website || '',
        notes: client?.notes || '',
      })
      setShowFullAddress(!!(client?.city || client?.postalCode || client?.country))
    }
  }, [client, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const headers = user?._id ? { 'X-User-Id': user._id } : undefined

    return runWithFeedback({
      action: async () => {
        if (client) {
          await callApi(`/clients/${client._id}`, {
            method: 'PUT',
            headers,
            body: formData,
          })
        } else {
          await callApi('/clients', {
            method: 'POST',
            headers,
            body: formData,
          })
        }
        onSave()
        onClose()
      },
      toastLoading: { message: client ? tToast('clientUpdating') : tToast('clientCreating') },
      toastSuccess: { message: client ? tToast('clientUpdated') : tToast('clientCreated') },
      toastError: { message: client ? tToast('clientUpdateFailed') : tToast('clientCreateFailed') },
      onLoadingChange: setIsLoading,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? tClient('edit') : tClient('create')}
      description={client ? tClient('edit') : tClient('create')}
      footer={
        <Div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className=" hover:bg-muted font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Icon name="lucide:X" className="w-4 h-4 mr-2" />
            {tCommon('cancel')}
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={!formData.clientName}
            className="bg-gradient-client hover:from-cyan-600 hover:to-blue-600 text-white transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            form="client-form"
          >
            <>
              <Icon name={client ? 'lucide:Save' : 'lucide:Plus'} className="w-4 h-4 mr-2" />
              {client ? tClient('update') : tClient('create')}
            </>
          </LoadingButton>
        </Div>
      }
    >
      <form
        id="client-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 m-1"
      >
        <Div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:User" className="w-4 h-4 mr-2 text-ezbill-client" />
            Client Name *
          </Label>
          <Div className="relative">
            <Input
              value={formData.clientName}
              onChange={e => setFormData({ ...formData, clientName: e.target.value })}
              required
              placeholder="Enter client name"
            />
          </Div>
        </Div>

        <Div>
          <Label className="text-sm font-medium mb-3  flex items-center">
            <Icon name="lucide:Type" className="w-4 h-4 mr-2 text-ezbill-client" />
            Client Type
          </Label>
          <Select
            value={formData.isCompany ? 'company' : 'individual'}
            onValueChange={value => setFormData({ ...formData, isCompany: value === 'company' })}
          >
            <SelectTrigger className="w-full ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual" className="hover:bg-primary/5">
                <Div className="flex items-center">
                  <Icon name="lucide:User" className="w-4 h-4 mr-2 text-ezbill-client" />
                  Individual
                </Div>
              </SelectItem>
              <SelectItem value="company" className="hover:bg-primary/5">
                <Div className="flex items-center">
                  <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-ezbill-client" />
                  Company
                </Div>
              </SelectItem>
            </SelectContent>
          </Select>
        </Div>

        <Div>
          <Label className="text-sm font-medium mb-3  flex items-center">
            <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-ezbill-client" />
            Email
          </Label>
          <Div className="relative">
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="client@example.com"
            />
          </Div>
        </Div>

        <Div>
          <Label className="text-sm font-medium mb-3  flex items-center">
            <Icon name="lucide:Phone" className="w-4 h-4 mr-2 text-ezbill-client" />
            Phone
          </Label>
          <Div className="relative">
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </Div>
        </Div>

        <Div>
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Icon name="lucide:Globe" className="w-4 h-4 mr-2 text-ezbill-client" />
            Website
          </Label>
          <Div className="relative">
            <Input
              type="url"
              value={formData.website}
              onChange={e => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </Div>
        </Div>

        <Div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-ezbill-client" />
            Address
          </Label>
          <Div className="relative">
            <Input
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </Div>
        </Div>

        <Div className="lg:col-span-2">
          <Div className="  p-4 border rounded-md">
            <Div className="flex items-center space-x-3">
              <Checkbox
                id="showFullAddress"
                checked={showFullAddress}
                onCheckedChange={(checked: boolean) => setShowFullAddress(checked)}
              />
              <Label
                htmlFor="showFullAddress"
                className="text-sm font-medium flex items-center cursor-pointer"
              >
                <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-ezbill-client" />
                Add detailed address (city, postal code, country)
              </Label>
            </Div>
          </Div>
        </Div>

        {showFullAddress && (
          <>
            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-ezbill-client" />
                City
              </Label>
              <Input
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="New York"
              />
            </Div>

            <Div>
              <Label className="text-sm font-medium mb-3  flex items-center">
                <Icon name="lucide:Hash" className="w-4 h-4 mr-2 text-ezbill-client" />
                Postal Code
              </Label>
              <Input
                value={formData.postalCode}
                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="10001"
              />
            </Div>

            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Flag" className="w-4 h-4 mr-2 text-ezbill-client" />
                Country
              </Label>
              <Input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="United States"
              />
            </Div>
          </>
        )}

        {formData.isCompany && (
          <>
            <Div className="lg:col-span-2 border-t border-primary/10 pt-6 mt-2">
              <Div className="flex items-center mb-4">
                <Icon name="lucide:Building2" className="w-5 h-5 mr-2 text-accent" />
                <H4 className="text-lg font-semibold text-foreground">Company Information</H4>
              </Div>
            </Div>

            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-accent" />
                Registration Number
              </Label>
              <Input
                value={formData.companyRegistrationNumber}
                onChange={e =>
                  setFormData({ ...formData, companyRegistrationNumber: e.target.value })
                }
                className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="12345678"
              />
            </Div>

            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Receipt" className="w-4 h-4 mr-2 text-accent" />
                Tax Number
              </Label>
              <Input
                value={formData.taxNumber}
                onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="TAX123456789"
              />
            </Div>
          </>
        )}

        {formData.isCompany && (
          <>
            <Div className="lg:col-span-2 border-t border-primary/10 pt-6 mt-2">
              <Div className="flex items-center mb-4">
                <Icon name="lucide:Users" className="w-5 h-5 mr-2 text-ezbill-client" />
                <H4 className="text-lg font-semibold text-foreground">Contact Person</H4>
                <Span className="ml-2 text-sm text-muted-foreground">(Optional)</Span>
              </Div>
            </Div>

            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:User" className="w-4 h-4 mr-2 text-ezbill-client" />
                Contact Name
              </Label>
              <Input
                value={formData.contactPersonName}
                onChange={e => setFormData({ ...formData, contactPersonName: e.target.value })}
                className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Jean-Baptiste"
              />
            </Div>

            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Briefcase" className="w-4 h-4 mr-2 text-ezbill-client" />
                Job Title
              </Label>
              <Input
                value={formData.contactPersonTitle}
                onChange={e => setFormData({ ...formData, contactPersonTitle: e.target.value })}
                className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Project Manager"
              />
            </Div>

            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-ezbill-client" />
                Contact Email
              </Label>
              <Input
                type="email"
                value={formData.contactPersonEmail}
                onChange={e => setFormData({ ...formData, contactPersonEmail: e.target.value })}
                className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="jean-baptiste@company.com"
              />
            </Div>

            <Div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Phone" className="w-4 h-4 mr-2 text-ezbill-client" />
                Contact Phone
              </Label>
              <Input
                value={formData.contactPersonPhone}
                onChange={e => setFormData({ ...formData, contactPersonPhone: e.target.value })}
                className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="+33 6 12 34 56 78"
              />
            </Div>
          </>
        )}

        <Div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-ezbill-client" />
            Notes
          </Label>
          <Textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3  backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm hover:shadow-md min-h-[100px] resize-none"
            placeholder="Additional notes about this client..."
            rows={4}
          />
        </Div>
      </form>
    </Modal>
  )
}
