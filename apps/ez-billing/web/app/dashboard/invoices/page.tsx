'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { useUserStore } from '@/stores/useUserStore';
import { InvoiceModal } from '@/components/invoice-modal';
import { MarkPaidModal } from '@/components/mark-paid-modal';
import { StatusChangeModal } from '@/components/status-change-modal';
import { Button, H2, Section, Span, Table } from '@ezstart/ui/components';
import { Invoice } from '@ez-billing/types';
import { useState } from 'react';
import { redirect } from 'next/navigation';

const InvoicesPage = () => {
  const { user } = useUserStore();
  const { invoices, clients, loading, refetchAll } = useBillingContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined);

  if (!user) {
    redirect('/');
    return null;
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleMarkPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaidModalOpen(true);
  };

  const handleChangeStatus = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsStatusModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingInvoice(undefined);
  };

  const handlePaidModalClose = () => {
    setIsPaidModalOpen(false);
    setSelectedInvoice(undefined);
  };

  const handleStatusModalClose = () => {
    setIsStatusModalOpen(false);
    setSelectedInvoice(undefined);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c._id === clientId);
    return client?.clientName || 'Unknown Client';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
    };
    return (
      <Span className={`px-2 py-1 rounded text-xs ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </Span>
    );
  };

  if (loading) return <div>Loading invoices...</div>;

  return (
    <Section>
      <div className="flex justify-between items-center mb-6">
        <H2>Invoices</H2>
        <Button onClick={() => setIsModalOpen(true)}>
          Create Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p>No invoices found. Create your first invoice!</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Client</th>
              <th>Total</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice._id}>
                <td>{invoice.documentNumber}</td>
                <td>{getClientName(invoice.clientId)}</td>
                <td>{invoice.total} {invoice.currency}</td>
                <td>{getStatusBadge(invoice.status)}</td>
                <td>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</td>
                <td className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(invoice)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleChangeStatus(invoice)}>
                    Status
                  </Button>
                  {invoice.status === 'sent' && (
                    <Button size="sm" onClick={() => handleMarkPaid(invoice)}>
                      Mark Paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <InvoiceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        clients={clients}
        invoice={editingInvoice}
        onSave={refetchAll}
      />

      {selectedInvoice && (
        <>
          <MarkPaidModal
            isOpen={isPaidModalOpen}
            onClose={handlePaidModalClose}
            invoice={selectedInvoice}
            onSave={refetchAll}
          />
          <StatusChangeModal
            isOpen={isStatusModalOpen}
            onClose={handleStatusModalClose}
            documentType="invoice"
            documentId={selectedInvoice._id}
            currentStatus={selectedInvoice.status}
            onSave={refetchAll}
          />
        </>
      )}
    </Section>
  );
};

export default InvoicesPage;
