'use client'

import { useUserStore } from '@/stores/useUserStore'
import { BillingClient, Client } from '@ez-billing/types'
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
} from '@ezstart/ui/components'
import { runWithFeedback } from '@ezstart/ui/utils'
import { useState } from 'react'
import { callBillingApi } from '../utils/call-billing-api'
import { LoadingButton } from './loading-button'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  client?: Client
  onSave: () => void
}

export function ClientModal({ isOpen, onClose, client, onSave }: ClientModalProps) {
  const { user } = useUserStore()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<BillingClient>({
    userId: client?.userId || user?._id || '',
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
    website: client?.website || '',
    notes: client?.notes || '',
  })

  const [showFullAddress, setShowFullAddress] = useState(
    !!(client?.city || client?.postalCode || client?.country)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    return runWithFeedback({
      action: async () => {
        if (client) {
          const res = await callBillingApi(`/clients/${client._id}`, {
            method: 'PUT',
            body: formData,
          })
          if (!res.ok) throw new Error('Failed to update client')
        } else {
          const res = await callBillingApi('/clients', {
            method: 'POST',
            body: formData,
          })
          if (!res.ok) throw new Error('Failed to create client')
        }
        onSave()
        onClose()
      },
      toastLoading: { message: client ? 'Updating client...' : 'Creating client...' },
      toastSuccess: { message: client ? 'Client updated' : 'Client created' },
      toastError: { message: client ? 'Failed to update client' : 'Failed to create client' },
      onLoadingChange: setIsLoading,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={client ? 'Edit Client' : 'Create Client'}
      description={client ? 'Update client information' : 'Add a new client to your billing system'}
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
            disabled={!formData.clientName}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            form="client-form"
          >
            <Icon name={client ? 'lucide:Save' : 'lucide:Plus'} className="w-4 h-4 mr-2" />
            {client ? 'Update Client' : 'Create Client'}
          </LoadingButton>
        </div>
      }
    >
      <div className="bg-gradient-to-br from-cyan-50/50 via-white to-blue-50/50 rounded-2xl p-6 border border-white/20">
        <form
          id="client-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="lg:col-span-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icon name="lucide:User" className="w-5 h-5 text-gray-400" />
              </div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                <Icon name="lucide:User" className="w-4 h-4 mr-2 text-cyan-500" />
                Client Name *
              </Label>
              <Input
                value={formData.clientName}
                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                required
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Enter client name"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
              <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-cyan-500" />
              Client Type
            </Label>
            <Select
              value={formData.isCompany ? 'company' : 'individual'}
              onValueChange={value => setFormData({ ...formData, isCompany: value === 'company' })}
            >
              <SelectTrigger className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/80 backdrop-blur-md border border-white/20 shadow-xl rounded-xl">
                <SelectItem value="individual" className="hover:bg-cyan-50">
                  <div className="flex items-center">
                    <Icon name="lucide:User" className="w-4 h-4 mr-2 text-green-500" />
                    Individual
                  </div>
                </SelectItem>
                <SelectItem value="company" className="hover:bg-cyan-50">
                  <div className="flex items-center">
                    <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-purple-500" />
                    Company
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
              <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-cyan-500" />
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
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="client@example.com"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
              <Icon name="lucide:Phone" className="w-4 h-4 mr-2 text-cyan-500" />
              Phone
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icon name="lucide:Phone" className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
              <Icon name="lucide:Globe" className="w-4 h-4 mr-2 text-cyan-500" />
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
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
              <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-cyan-500" />
              Address
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icon name="lucide:MapPin" className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="123 Main Street"
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
                  className="border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                />
                <Label
                  htmlFor="showFullAddress"
                  className="text-sm font-medium text-gray-700 flex items-center cursor-pointer"
                >
                  <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-cyan-500" />
                  Add detailed address (city, postal code, country)
                </Label>
              </div>
            </div>
          </div>

          {showFullAddress && (
            <>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                  <Icon name="lucide:Building" className="w-4 h-4 mr-2 text-cyan-500" />
                  City
                </Label>
                <Input
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="New York"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                  <Icon name="lucide:Hash" className="w-4 h-4 mr-2 text-cyan-500" />
                  Postal Code
                </Label>
                <Input
                  value={formData.postalCode}
                  onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="10001"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                  <Icon name="lucide:Flag" className="w-4 h-4 mr-2 text-cyan-500" />
                  Country
                </Label>
                <Input
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="United States"
                />
              </div>
            </>
          )}

          {formData.isCompany && (
            <>
              <div className="lg:col-span-2 border-t border-cyan-200/50 pt-6 mt-2">
                <div className="flex items-center mb-4">
                  <Icon name="lucide:Building2" className="w-5 h-5 mr-2 text-purple-500" />
                  <h4 className="text-lg font-semibold text-gray-900">Company Information</h4>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                  <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-purple-500" />
                  Registration Number
                </Label>
                <Input
                  value={formData.companyRegistrationNumber}
                  onChange={e =>
                    setFormData({ ...formData, companyRegistrationNumber: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="12345678"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                  <Icon name="lucide:Receipt" className="w-4 h-4 mr-2 text-purple-500" />
                  Tax Number
                </Label>
                <Input
                  value={formData.taxNumber}
                  onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="TAX123456789"
                />
              </div>
            </>
          )}

          <div className="lg:col-span-2">
            <Label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
              <Icon name="lucide:FileText" className="w-4 h-4 mr-2 text-cyan-500" />
              Notes
            </Label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 shadow-sm hover:shadow-md min-h-[100px] resize-none"
              placeholder="Additional notes about this client..."
              rows={4}
            />
          </div>
        </form>
      </div>
    </Modal>
  )
}
