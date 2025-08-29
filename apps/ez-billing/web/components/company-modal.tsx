'use client';

import { Company, CreateCompany } from '@ez-billing/types';
import { useUserStore } from '@/stores/useUserStore';
import { Button, H3, Input, Label, Modal, Section } from '@ezstart/ui/components';
import { callApi, runWithFeedback } from '@ezstart/ui/utils';
import { useState } from 'react';
import { LoadingButton } from './loading-button';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: Company;
  onSave: () => void;
}

export function CompanyModal({ isOpen, onClose, company, onSave }: CompanyModalProps) {
  const { user } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const dataToSend = { ...formData, userId: user._id };

    return runWithFeedback({
      action: async () => {
        if (company) {
          const res = await callApi(`/api/companies/${company._id}`, {
            method: 'PUT',
            body: dataToSend,
          });
          if (!res.ok) throw new Error('Failed to update company');
        } else {
          const res = await callApi('/api/companies', {
            method: 'POST',
            body: dataToSend,
          });
          if (!res.ok) throw new Error('Failed to create company');
        }
        onSave();
        onClose();
      },
      toastLoading: { message: company ? 'Updating company...' : 'Creating company...' },
      toastSuccess: { message: company ? 'Company updated' : 'Company created' },
      toastError: { message: company ? 'Failed to update company' : 'Failed to create company' },
      onLoadingChange: setIsLoading,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Section className="p-6 max-w-2xl">
        <H3>{company ? 'Edit Company' : 'Create Company'}</H3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="md:col-span-2">
            <Label>Company Name</Label>
            <Input
              value={formData.companyName}
              onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              required
            />
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
          
          <div>
            <Label>Website</Label>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
            />
          </div>
          
          <div className="md:col-span-2 flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <LoadingButton 
              loading={isLoading} 
              type="submit"
              disabled={!formData.companyName}
            >
              {company ? 'Update' : 'Create'}
            </LoadingButton>
          </div>
        </form>
      </Section>
    </Modal>
  );
}