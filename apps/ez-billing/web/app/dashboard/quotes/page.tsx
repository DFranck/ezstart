'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { useUserStore } from '@/stores/useUserStore';
import { QuoteModal } from '@/components/quote-modal';
import { StatusChangeModal } from '@/components/status-change-modal';
import { Button, H2, Section, Span, Table } from '@ezstart/ui/components';
import { Quote } from '@ez-billing/types';
import { useState } from 'react';
import { redirect } from 'next/navigation';

const QuotesPage = () => {
  const { user } = useUserStore();
  const { quotes, clients, loading, refetchAll } = useBillingContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | undefined>(undefined);
  const [selectedQuote, setSelectedQuote] = useState<Quote | undefined>(undefined);

  if (!user) {
    redirect('/');
    return null;
  }

  const handleEdit = (quote: Quote) => {
    setEditingQuote(quote);
    setIsModalOpen(true);
  };

  const handleChangeStatus = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsStatusModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingQuote(undefined);
  };

  const handleStatusModalClose = () => {
    setIsStatusModalOpen(false);
    setSelectedQuote(undefined);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c._id === clientId);
    return client?.clientName || 'Unknown Client';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <Span className={`px-2 py-1 rounded text-xs ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </Span>
    );
  };

  if (loading) return <div>Loading quotes...</div>;

  return (
    <Section>
      <div className="flex justify-between items-center mb-6">
        <H2>Quotes</H2>
        <Button onClick={() => setIsModalOpen(true)}>
          Create Quote
        </Button>
      </div>

      {quotes.length === 0 ? (
        <p>No quotes found. Create your first quote!</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Client</th>
              <th>Total</th>
              <th>Status</th>
              <th>Valid Until</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote._id}>
                <td>{quote.documentNumber}</td>
                <td>{getClientName(quote.clientId)}</td>
                <td>{quote.total} {quote.currency}</td>
                <td>{getStatusBadge(quote.status)}</td>
                <td>{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}</td>
                <td className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(quote)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleChangeStatus(quote)}>
                    Status
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <QuoteModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        clients={clients}
        quote={editingQuote}
        onSave={refetchAll}
      />

      {selectedQuote && (
        <StatusChangeModal
          isOpen={isStatusModalOpen}
          onClose={handleStatusModalClose}
          documentType="quote"
          documentId={selectedQuote._id}
          currentStatus={selectedQuote.status}
          onSave={refetchAll}
        />
      )}
    </Section>
  );
};

export default QuotesPage;
