'use client'

import { useUserStore } from '@/stores/useUserStore'
import { Company, CreateCompany } from '@ez-billing/types'
import { Button, Checkbox, Input, Label, Modal } from '@ezstart/ui/components'
import { callApi, runWithFeedback } from '@ezstart/ui/utils'
import { useState } from 'react'
import { LoadingButton } from './loading-button'

interface CompanyModalProps {
  isOpen: boolean
  onClose: () => void
  company?: Company
  onSave: () => void
}

export function CompanyModal({ isOpen, onClose, company, onSave }: CompanyModalProps) {
  const { user } = useUserStore()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<CreateCompany>({
    userId: user?._id || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const dataToSend = { ...formData, userId: user._id }

    return runWithFeedback({
      action: async () => {
        if (company) {
          const res = await callApi(`/companies/${company._id}`, {
            method: 'PUT',
            body: dataToSend,
          })
          if (!res.ok) throw new Error('Failed to update company')
        } else {
          const res = await callApi('/companies', {
            method: 'POST',
            body: dataToSend,
          })
          if (!res.ok) throw new Error('Failed to create company')
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
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md font-medium transition-colors"
          >
            Cancel
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={!formData.companyName}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            form="company-form"
          >
            {company ? 'Update Company' : 'Create Company'}
          </LoadingButton>
        </div>
      }
    >
      <form
        id="company-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1"
      >
        <div className="lg:col-span-2">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Company Name *</Label>
          <Input
            value={formData.companyName}
            onChange={e => setFormData({ ...formData, companyName: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Enter company name"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="company@example.com"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Phone</Label>
          <Input
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Website</Label>
          <Input
            type="url"
            value={formData.website}
            onChange={e => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="https://company.com"
          />
        </div>

        <div className="lg:col-span-2">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Address</Label>
          <Input
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="123 Business Street"
          />
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showFullAddress"
              checked={showFullAddress}
              onCheckedChange={(checked: boolean) => setShowFullAddress(checked)}
            />
            <Label htmlFor="showFullAddress" className="text-sm text-gray-700">
              Add detailed address (city, postal code, country)
            </Label>
          </div>
        </div>

        {showFullAddress && (
          <>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">City</Label>
              <Input
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="New York"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Postal Code</Label>
              <Input
                value={formData.postalCode}
                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="10001"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Country</Label>
              <Input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="United States"
              />
            </div>
          </>
        )}

        <div className="lg:col-span-2 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Legal Information</h4>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Registration Number
          </Label>
          <Input
            value={formData.companyRegistrationNumber}
            onChange={e => setFormData({ ...formData, companyRegistrationNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="12345678"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Tax Number</Label>
          <Input
            value={formData.taxNumber}
            onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="TAX123456789"
          />
        </div>
      </form>
    </Modal>
  )
}
