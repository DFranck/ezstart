'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { useUserStore } from '@/stores/useUserStore';
import { Button, H2, Section, Span, Table } from '@ezstart/ui/components';
import { redirect } from 'next/navigation';

const ReceiptsPage = () => {
  const { user } = useUserStore();
  const { receipts, clients, loading } = useBillingContext();

  if (!user) {
    redirect('/');
    return null;
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c._id === clientId);
    return client?.clientName || 'Unknown Client';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      issued: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800',
    };
    return (
      <Span className={`px-2 py-1 rounded text-xs ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </Span>
    );
  };

  if (loading) return <div>Loading receipts...</div>;

  return (
    <Section>
      <div className="flex justify-between items-center mb-6">
        <H2>Receipts</H2>
      </div>

      {receipts.length === 0 ? (
        <p>No receipts found. Receipts are automatically created when invoices are marked as paid.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Client</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment Date</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt._id}>
                <td>{receipt.documentNumber}</td>
                <td>{getClientName(receipt.clientId)}</td>
                <td>{receipt.total} {receipt.currency}</td>
                <td>{getStatusBadge(receipt.status)}</td>
                <td>{receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString() : '-'}</td>
                <td>{new Date(receipt.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Section>
  );
};

export default ReceiptsPage;
