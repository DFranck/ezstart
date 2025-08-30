'use client';

import { BaseLineItem, Client, CreateQuote, Currency, Quote } from '@ez-billing/types';
import { Button, H3, Input, Label, Modal, Section, Select, TextArea } from '@ezstart/ui/components';
import { callApi, runWithFeedback } from '@ezstart/ui/utils';
import { useState } from 'react';
import { LoadingButton } from './loading-button';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  quote?: Quote;
  onSave: () => void;
}

const currencies: { value: Currency; label: string }[] = [
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

export function QuoteModal({ isOpen, onClose, clients, quote, onSave }: QuoteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<CreateQuote>({
    clientId: quote?.clientId || '',
    items: quote?.items?.map(item => ({
      label: item.label,
      quantity: item.quantity,
      price: item.price,
    })) || [{ label: '', quantity: 1, price: 0 }],
    currency: quote?.currency || 'EUR',
    dueDate: quote?.dueDate || '',
    notes: quote?.notes || '',
    terms: quote?.terms || '',
    taxRate: quote?.taxRate || 20,
    status: quote?.status || 'draft',
    validUntil: quote?.validUntil || '',
  });

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { label: '', quantity: 1, price: 0 }],
    });
  };

  const updateLineItem = (index: number, field: keyof BaseLineItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value } as BaseLineItem;
    setFormData({ ...formData, items: updatedItems });
  };

  const removeLineItem = (index: number) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: updatedItems });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    return runWithFeedback({
      action: async () => {
        if (quote) {
          const res = await callApi(`/quotes/${quote._id}`, {
            method: 'PUT',
            body: formData,
          });
          if (!res.ok) throw new Error('Failed to update quote');
        } else {
          const res = await callApi('/quotes', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('Failed to create quote');
        }
        onSave();
        onClose();
      },
      toastLoading: { message: quote ? 'Updating quote...' : 'Creating quote...' },
      toastSuccess: { message: quote ? 'Quote updated' : 'Quote created' },
      toastError: { message: quote ? 'Failed to update quote' : 'Failed to create quote' },
      onLoadingChange: setIsLoading,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Section className="p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <H3>{quote ? 'Edit Quote' : 'Create Quote'}</H3>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({...formData, clientId: value})}
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.clientName}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value: Currency) => setFormData({...formData, currency: value})}
              >
                {currencies.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
              />
            </div>

            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.taxRate}
                onChange={(e) => setFormData({...formData, taxRate: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div>
            <H3>Line Items</H3>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end mb-2">
                <Input
                  placeholder="Description"
                  value={item.label}
                  onChange={(e) => updateLineItem(index, 'label', e.target.value)}
                  className="col-span-6"
                  required
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="col-span-2"
                  required
                />
                <Input
                  type="number"
                  placeholder="Price"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(e) => updateLineItem(index, 'price', parseFloat(e.target.value) || 0)}
                  className="col-span-3"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeLineItem(index)}
                  className="col-span-1"
                  disabled={formData.items.length === 1}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addLineItem}>
              Add Line Item
            </Button>
          </div>

          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            rows={3}
          />

          <TextArea
            label="Terms"
            value={formData.terms}
            onChange={(e) => setFormData({...formData, terms: e.target.value})}
            rows={3}
          />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <LoadingButton 
              loading={isLoading} 
              type="submit"
              disabled={!formData.clientId || formData.items.some(item => !item.label)}
            >
              {quote ? 'Update' : 'Create'}
            </LoadingButton>
          </div>
        </form>
      </Section>
    </Modal>
  );
}