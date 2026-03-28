'use client'

import { callApi, parseApiError, runWithFeedback } from '@/utils/api'
import { Company, CreateCompany } from '@ezbill/types'
import { Button, Checkbox, Icon, Input, Label, Modal } from '@ezstart/ui/components'
import { useAuth } from '@ezstart/auth-sdk'
import { useEffect, useState } from 'react'
import { LoadingButton } from './loading-button'

interface CompanyModalProps {
  isOpen: boolean
  onClose: () => void
  company?: Company
  onSave: () => void
}

export function CompanyModal({ isOpen, onClose, company, onSave }: CompanyModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<CreateCompany>({
    userId: '',
    companyName: company?.companyName || '',
    email: company?.email || '',
    phone: company?.phone || '',
    address: company?.address || '',
    city: company?.city || '',
    postalCode: company?.postalCode || '',
    country: company?.country || '',
    companyRegistrationNumber: company?.companyRegistrationNumber || '',
    taxNumber: company?.taxNumber || '',
    website: company?.website || '',
  })

  const [showFullAddress, setShowFullAddress] = useState(
    !!(company?.city || company?.postalCode || company?.country)
  )

  // Update form data when company changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        userId: '',
        companyName: company?.companyName || '',
        email: company?.email || '',
        phone: company?.phone || '',
        address: company?.address || '',
        city: company?.city || '',
        postalCode: company?.postalCode || '',
        country: company?.country || '',
        companyRegistrationNumber: company?.companyRegistrationNumber || '',
        taxNumber: company?.taxNumber || '',
        website: company?.website || '',
      })
      setShowFullAddress(!!(company?.city || company?.postalCode || company?.country))
    }
  }, [company, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const userId = user?._id
    if (!userId) return

    const dataToSend = { ...formData, userId }

    return runWithFeedback({
      action: async () => {
        if (company) {
          const res = await callApi(`/companies/${company._id}`, {
            method: 'PUT',
            userId: user?._id,
            body: dataToSend,
          })
          if (!res.ok) throw new Error(parseApiError(res.data))
        } else {
          const res = await callApi('/companies', {
            method: 'POST',
            userId: user?._id,
            body: dataToSend,
          })
          if (!res.ok) throw new Error(parseApiError(res.data))
        }
        onSave()
        onClose()
      },
      toastLoading: { message: company ? 'Updating company...' : 'Creating company...' },
      toastSuccess: { message: company ? 'Company updated' : 'Company created' },
      toastError: { message: company ? 'Failed to update company' : 'Failed to create company' },
      onLoadingChange: setIsLoading,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? 'Edit Company' : 'Create Company'}
      description={
        company ? 'Update your company information' : 'Add your company to start billing clients'
      }
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="hover:bg-muted font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Icon name="lucide:X" className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={!formData.companyName}
            className="bg-gradient-company hover:from-indigo-600 hover:to-purple-600 text-white transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            form="company-form"
          >
            <Icon name={company ? 'lucide:Save' : 'lucide:Plus'} className="w-4 h-4 mr-2" />
            {company ? 'Update Company' : 'Create Company'}
          </LoadingButton>
        </div>
      }
    >
      <form
        id="company-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 m-1"
      >
        <div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:Building2" className="w-4 h-4 mr-2 text-ezbill-company" />
            Company Name *
          </Label>
          <div className="relative">
            <Input
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              required
              placeholder="Enter company name"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-ezbill-company" />
            Email
          </Label>
          <div className="relative">
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="company@example.com"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:Phone" className="w-4 h-4 mr-2 text-ezbill-company" />
            Phone
          </Label>
          <div className="relative">
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-3 flex items-center">
            <Icon name="lucide:Globe" className="w-4 h-4 mr-2 text-ezbill-company" />
            Website
          </Label>
          <div className="relative">
            <Input
              type="url"
              value={formData.website}
              onChange={e => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://company.com"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-ezbill-company" />
            Address
          </Label>
          <div className="relative">
            <Input
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Business Street"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="p-4 border rounded-md">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="showFullAddress"
                checked={showFullAddress}
                onCheckedChange={(checked: boolean) => setShowFullAddress(checked)}
                className="border-accent/30 text-ezbill-company focus:ring-accent"
              />
              <Label
                htmlFor="showFullAddress"
                className="text-sm font-medium flex items-center cursor-pointer"
              >
                <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-ezbill-company" />
                Add detailed address (city, postal code, country)
              </Label>
            </div>
          </div>
        </div>

        {showFullAddress && (
          <>
            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-ezbill-company" />
                City
              </Label>
              <Input
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="New York"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 flex items-center">
                <Icon name="lucide:Hash" className="w-4 h-4 mr-2 text-ezbill-company" />
                Postal Code
              </Label>
              <Input
                value={formData.postalCode}
                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="10001"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block flex items-center">
                <Icon name="lucide:Flag" className="w-4 h-4 mr-2 text-ezbill-company" />
                Country
              </Label>
              <Input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="United States"
              />
            </div>
          </>
        )}

        <div className="lg:col-span-2 border-t border-purple-200/50 pt-6 mt-2">
          <div className="flex items-center mb-4">
            <Icon name="lucide:Scale" className="w-5 h-5 mr-2 text-warning" />
            <h4 className="text-lg font-semibold ">Legal Information</h4>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-warning" />
            Registration Number
          </Label>
          <Input
            value={formData.companyRegistrationNumber}
            onChange={e => setFormData({ ...formData, companyRegistrationNumber: e.target.value })}
            className="w-full px-4 py-3 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm hover:shadow-md"
            placeholder="12345678"
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Icon name="lucide:Receipt" className="w-4 h-4 mr-2 text-warning" />
            Tax Number
          </Label>
          <Input
            value={formData.taxNumber}
            onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
            className="w-full px-4 py-3 backdrop-blur-sm border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm hover:shadow-md"
            placeholder="TAX123456789"
          />
        </div>
      </form>
    </Modal>
  )
}
