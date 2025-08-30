'use client'

import { useUserStore } from '@/stores/useUserStore'
import { BillingClient, Client } from '@ez-billing/types'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import { callApi, runWithFeedback } from '@ezstart/ui/utils'
import { useState } from 'react'
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
          const res = await callApi(`/clients/${client._id}`, {
            method: 'PUT',
            body: formData,
          })
          if (!res.ok) throw new Error('Failed to update client')
        } else {
          const res = await callApi('/clients', {
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
            disabled={!formData.clientName}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            form="client-form"
          >
            {client ? 'Update Client' : 'Create Client'}
          </LoadingButton>
        </div>
      }
    >
      <form
        id="client-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1"
      >
        <div className="lg:col-span-2">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Client Name *</Label>
          <Input
            value={formData.clientName}
            onChange={e => setFormData({ ...formData, clientName: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter client name"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Client Type</Label>
          <Select
            value={formData.isCompany ? 'company' : 'individual'}
            onValueChange={value => setFormData({ ...formData, isCompany: value === 'company' })}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="company">Company</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="client@example.com"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Phone</Label>
          <Input
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Website</Label>
          <Input
            type="url"
            value={formData.website}
            onChange={e => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://example.com"
          />
        </div>

        <div className="lg:col-span-2">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Address</Label>
          <Input
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="123 Main Street"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="New York"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Postal Code</Label>
              <Input
                value={formData.postalCode}
                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10001"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Country</Label>
              <Input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="United States"
              />
            </div>
          </>
        )}

        {formData.isCompany && (
          <>
            <div className="lg:col-span-2 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Company Information</h4>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Registration Number
              </Label>
              <Input
                value={formData.companyRegistrationNumber}
                onChange={e =>
                  setFormData({ ...formData, companyRegistrationNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="12345678"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Tax Number</Label>
              <Input
                value={formData.taxNumber}
                onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="TAX123456789"
              />
            </div>
          </>
        )}

        <div className="lg:col-span-2">
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Notes</Label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px] resize-none"
            placeholder="Additional notes about this client..."
            rows={3}
          />
        </div>
      </form>
    </Modal>
  )
}
