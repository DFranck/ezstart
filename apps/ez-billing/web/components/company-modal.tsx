'use client'

import { useUserStore } from '@/stores/useUserStore'
import { Company, CreateCompany } from '@ez-billing/types'
import { Button, Checkbox, Icon, Input, Label, Modal } from '@ezstart/ui/components'
import { runWithFeedback } from '@ezstart/ui/utils'
import { callApi } from '@ezstart/ui/utils'
import { getUserId } from '../utils/get-user-id'
import { useState, useEffect } from 'react'
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

  // Update form data when company changes
  useEffect(() => {
    setFormData({
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
    setShowFullAddress(!!(company?.city || company?.postalCode || company?.country))
  }, [company, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const dataToSend = { ...formData, userId: user._id }

    return runWithFeedback({
      action: async () => {
        if (company) {
          const res = await callApi(`/companies/${company._id}`, {
            method: 'PUT',
            userId: getUserId(),
            body: dataToSend,
          })
          if (!res.ok) throw new Error('Failed to update company')
        } else {
          const res = await callApi('/companies', {
            method: 'POST',
            userId: getUserId(),
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
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end bg-white/70 backdrop-blur-sm border-t border-white/20 p-6 -m-6 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-white/60 backdrop-blur-sm border-white/30 text-gray-700 hover:bg-white/80 font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Icon name="lucide:X" className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <LoadingButton
            loading={isLoading}
            type="submit"
            disabled={!formData.companyName}
            className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            form="company-form"
          >
            <Icon name={company ? "lucide:Save" : "lucide:Plus"} className="w-4 h-4 mr-2" />
            {company ? 'Update Company' : 'Create Company'}
          </LoadingButton>
        </div>
      }
    >
      <div className="bg-gradient-to-br from-emerald-50/50 via-white to-green-50/50 rounded-2xl p-6 border border-white/20">
        <form
          id="company-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
        <div className="lg:col-span-2">
          <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
            <Icon name="lucide:Building2" className="w-4 h-4 mr-2 text-emerald-500" />
            Company Name *
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Icon name="lucide:Building2" className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              required
              className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="Enter company name"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
            <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-emerald-500" />
            Email
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Icon name="lucide:Mail" className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="company@example.com"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
            <Icon name="lucide:Phone" className="w-4 h-4 mr-2 text-emerald-500" />
            Phone
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Icon name="lucide:Phone" className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
            <Icon name="lucide:Globe" className="w-4 h-4 mr-2 text-emerald-500" />
            Website
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Icon name="lucide:Globe" className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              type="url"
              value={formData.website}
              onChange={e => setFormData({ ...formData, website: e.target.value })}
              className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="https://company.com"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
            <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-emerald-500" />
            Address
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Icon name="lucide:MapPin" className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
              placeholder="123 Business Street"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white/30 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="showFullAddress"
                checked={showFullAddress}
                onCheckedChange={(checked: boolean) => setShowFullAddress(checked)}
                className="border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="showFullAddress" className="text-sm font-medium text-gray-700 flex items-center cursor-pointer">
                <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-emerald-500" />
                Add detailed address (city, postal code, country)
              </Label>
            </div>
          </div>
        </div>

        {showFullAddress && (
          <>
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-emerald-500" />
                City
              </Label>
              <Input
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="New York"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                <Icon name="lucide:Hash" className="w-4 h-4 mr-2 text-emerald-500" />
                Postal Code
              </Label>
              <Input
                value={formData.postalCode}
                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="10001"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                <Icon name="lucide:Flag" className="w-4 h-4 mr-2 text-emerald-500" />
                Country
              </Label>
              <Input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="United States"
              />
            </div>
          </>
        )}

        <div className="lg:col-span-2 border-t border-emerald-200/50 pt-6 mt-2">
          <div className="flex items-center mb-4">
            <Icon name="lucide:Scale" className="w-5 h-5 mr-2 text-orange-500" />
            <h4 className="text-lg font-semibold text-gray-900">Legal Information</h4>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
            <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-orange-500" />
            Registration Number
          </Label>
          <Input
            value={formData.companyRegistrationNumber}
            onChange={e => setFormData({ ...formData, companyRegistrationNumber: e.target.value })}
            className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm hover:shadow-md"
            placeholder="12345678"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
            <Icon name="lucide:Receipt" className="w-4 h-4 mr-2 text-orange-500" />
            Tax Number
          </Label>
          <Input
            value={formData.taxNumber}
            onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
            className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm hover:shadow-md"
            placeholder="TAX123456789"
          />
        </div>
      </form>
      </div>
    </Modal>
  )
}
