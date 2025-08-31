'use client';

import { Company, CreateReceipt, Invoice } from '@ez-billing/types';
import { Button, H3, Input, Label, Modal, Section, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TextArea } from '@ezstart/ui/components';
import { callApi, runWithFeedback } from '@ezstart/ui/utils';
import { useState } from 'react';
import { LoadingButton } from './loading-button';

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  companies: Company[];
  onSave: () => void;
}

export function MarkPaidModal({ isOpen, onClose, invoice, companies, onSave }: MarkPaidModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<CreateReceipt>({
    clientId: invoice.clientId,
    companyId: invoice.companyId || '',
    items: invoice.items.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })),
    currency: invoice.currency,
    notes: `Payment received for invoice ${invoice.documentNumber}`,
    terms: '',
    taxRate: invoice.taxRate,
    status: 'issued',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    return runWithFeedback({
      action: async () => {
        // Create receipt
        const receiptRes = await callApi('/receipts', {
          method: 'POST',
          body: formData,
        });
        if (!receiptRes.ok) throw new Error('Failed to create receipt');

        // Update invoice status to paid
        const invoiceRes = await callApi(`/invoices/${invoice._id}`, {
          method: 'PUT',
          body: { status: 'paid' },
        });
        if (!invoiceRes.ok) throw new Error('Failed to update invoice status');

        onSave();
        onClose();
      },
      toastLoading: { message: 'Marking invoice as paid...' },
      toastSuccess: { message: 'Invoice marked as paid and receipt created' },
      toastError: { message: 'Failed to mark invoice as paid' },
      onLoadingChange: setIsLoading,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Invoice as Paid"
      description="This will create a receipt and mark the invoice as paid."
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <LoadingButton 
            loading={isLoading} 
            type="submit"
            form="mark-paid-form"
          >
            Mark as Paid
          </LoadingButton>
        </div>
      }
    >
      <form id="mark-paid-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Bill on behalf of</Label>
            <Select
              value={formData.companyId || 'personal'}
              onValueChange={value => setFormData({ ...formData, companyId: value === 'personal' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select billing entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal (your name)</SelectItem>
                {companies?.map(company => (
                  <SelectItem key={company._id} value={company._id}>
                    {company.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
              required
            />
          </div>

          <div>
            <Label>Notes</Label>
            <TextArea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

        </form>
    </Modal>
  );
}