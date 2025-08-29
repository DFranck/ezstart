'use client';

import { BillingClient, Client } from '@ez-billing/types';
import { Button, H3, Input, Label, Modal, Section, Select } from '@ezstart/ui/components';
import { callApi, runWithFeedback } from '@ezstart/ui/utils';
import { useState } from 'react';
import { LoadingButton } from './loading-button';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
  onSave: () => void;
}

export function ClientModal({ isOpen, onClose, client, onSave }: ClientModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<BillingClient>({
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    return runWithFeedback({
      action: async () => {
        if (client) {
          const res = await callApi(`/api/clients/${client._id}`, {
            method: 'PUT',
            body: formData,
          });
          if (!res.ok) throw new Error('Failed to update client');
        } else {
          const res = await callApi('/api/clients', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('Failed to create client');
        }
        onSave();
        onClose();
      },
      toastLoading: { message: client ? 'Updating client...' : 'Creating client...' },
      toastSuccess: { message: client ? 'Client updated' : 'Client created' },
      toastError: { message: client ? 'Failed to update client' : 'Failed to create client' },
      onLoadingChange: setIsLoading,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Section className="p-6 max-w-2xl">
        <H3>{client ? 'Edit Client' : 'Create Client'}</H3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="md:col-span-2">
            <Label>Client Name</Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              required
            />
          </div>
          
          <div>
            <Label>Type</Label>
            <Select
              value={formData.isCompany ? 'company' : 'individual'}
              onValueChange={(value) => setFormData({...formData, isCompany: value === 'company'})}
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </Select>
          </div>
          
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          
          <div>
            <Label>Website</Label>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
            />
          </div>
          
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          
          <div>
            <Label>City</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
            />
          </div>
          
          <div>
            <Label>Postal Code</Label>
            <Input
              value={formData.postalCode}
              onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
            />
          </div>
          
          <div>
            <Label>Country</Label>
            <Input
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
            />
          </div>
          
          {formData.isCompany && (
            <>
              <div>
                <Label>Registration Number</Label>
                <Input
                  value={formData.companyRegistrationNumber}
                  onChange={(e) => setFormData({...formData, companyRegistrationNumber: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Tax Number</Label>
                <Input
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                />
              </div>
            </>
          )}
          
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          
          <div className="md:col-span-2 flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <LoadingButton 
              loading={isLoading} 
              type="submit"
              disabled={!formData.clientName}
            >
              {client ? 'Update' : 'Create'}
            </LoadingButton>
          </div>
        </form>
      </Section>
    </Modal>
  );
}