'use client';

import { Button, H3, Label, Modal, Section, Select } from '@ezstart/ui/components';
import { callApi, runWithFeedback } from '@ezstart/ui/utils';
import { useState } from 'react';
import { LoadingButton } from './loading-button';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'invoice' | 'quote' | 'receipt';
  documentId: string;
  currentStatus: string;
  onSave: () => void;
}

const statusOptions = {
  invoice: [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
  ],
  quote: [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
  ],
  receipt: [
    { value: 'issued', label: 'Issued' },
    { value: 'refunded', label: 'Refunded' },
  ],
};

export function StatusChangeModal({
  isOpen,
  onClose,
  documentType,
  documentId,
  currentStatus,
  onSave,
}: StatusChangeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);

  const apiEndpoints = {
    invoice: '/invoices',
    quote: '/quotes',
    receipt: '/receipts',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === currentStatus) {
      onClose();
      return;
    }

    return runWithFeedback({
      action: async () => {
        const res = await callApi(`${apiEndpoints[documentType]}/${documentId}`, {
          method: 'PUT',
          body: { status: newStatus },
        });
        if (!res.ok) throw new Error(`Failed to update ${documentType} status`);
        onSave();
        onClose();
      },
      toastLoading: { message: `Updating ${documentType} status...` },
      toastSuccess: { message: `${documentType} status updated` },
      toastError: { message: `Failed to update ${documentType} status` },
      onLoadingChange: setIsLoading,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change ${documentType} Status`}
      description={`Update the status of this ${documentType}`}
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <LoadingButton 
            loading={isLoading} 
            type="submit"
            disabled={newStatus === currentStatus}
            form="status-change-form"
          >
            Update Status
          </LoadingButton>
        </div>
      }
    >
      <form id="status-change-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>New Status</Label>
            <Select
              value={newStatus}
              onValueChange={setNewStatus}
            >
              {statusOptions[documentType].map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

        </form>
    </Modal>
  );
}