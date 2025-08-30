'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { useUserStore } from '@/stores/useUserStore';
import { InvoiceModal } from '@/components/invoice-modal';
import { QuoteModal } from '@/components/quote-modal';
import { MarkPaidModal } from '@/components/mark-paid-modal';
import { Button, H1, H2, H3, P, Section, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ezstart/ui/components';
import { Client, Invoice, Quote, Receipt } from '@ez-billing/types';
import { useState, useEffect } from 'react';
import { redirect, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const ClientDashboardPage = () => {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  
  const { user } = useUserStore();
  const { clients, invoices, quotes, receipts, refetchAll, loading } = useBillingContext();
  
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
  const [editingQuote, setEditingQuote] = useState<Quote | undefined>(undefined);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(undefined);
  
  if (!user) {
    redirect('/');
    return null;
  }

  const client = clients.find((c: Client) => c._id === clientId);
  
  if (!loading && !client) {
    redirect('/dashboard');
    return null;
  }

  const clientInvoices = invoices.filter((invoice: Invoice) => invoice.clientId === clientId);
  const clientQuotes = quotes.filter((quote: Quote) => quote.clientId === clientId);
  const clientReceipts = receipts.filter((receipt: Receipt) => receipt.clientId === clientId);

  const handleCreateInvoice = () => {
    setEditingInvoice(undefined);
    setIsInvoiceModalOpen(true);
  };

  const handleCreateQuote = () => {
    setEditingQuote(undefined);
    setIsQuoteModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setIsQuoteModalOpen(true);
  };

  const handleMarkPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsMarkPaidModalOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <div className="mb-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          ← Back to Dashboard
        </Link>
      </div>

      <Section className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <H1>{client?.clientName}</H1>
            {client?.email && <P className="text-muted-foreground">{client.email}</P>}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateQuote} variant="outline">
              New Quote
            </Button>
            <Button onClick={handleCreateInvoice}>
              New Invoice
            </Button>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="mb-8">
          <H2 className="mb-4">Invoices ({clientInvoices.length})</H2>
          {clientInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientInvoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell>#{invoice.documentNumber}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {invoice.total} {invoice.currency}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditInvoice(invoice)}
                        >
                          Edit
                        </Button>
                        {invoice.status !== 'paid' && (
                          <Button 
                            size="sm"
                            onClick={() => handleMarkPaid(invoice)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <P className="text-muted-foreground">No invoices yet</P>
          )}
        </div>

        {/* Quotes Section */}
        <div className="mb-8">
          <H2 className="mb-4">Quotes ({clientQuotes.length})</H2>
          {clientQuotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientQuotes.map((quote) => (
                  <TableRow key={quote._id}>
                    <TableCell>#{quote.documentNumber}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm ${
                        quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {quote.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {quote.total} {quote.currency}
                    </TableCell>
                    <TableCell>
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditQuote(quote)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <P className="text-muted-foreground">No quotes yet</P>
          )}
        </div>

        {/* Receipts Section */}
        <div>
          <H2 className="mb-4">Receipts ({clientReceipts.length})</H2>
          {clientReceipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientReceipts.map((receipt) => (
                  <TableRow key={receipt._id}>
                    <TableCell>#{receipt.documentNumber}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm ${
                        receipt.status === 'refunded' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {receipt.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {receipt.total} {receipt.currency}
                    </TableCell>
                    <TableCell>
                      {receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <P className="text-muted-foreground">No receipts yet</P>
          )}
        </div>
      </Section>

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={editingInvoice}
        clients={clients}
        onSave={refetchAll}
      />
      
      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        quote={editingQuote}
        clients={clients}
        onSave={refetchAll}
      />

      {selectedInvoice && (
        <MarkPaidModal
          isOpen={isMarkPaidModalOpen}
          onClose={() => setIsMarkPaidModalOpen(false)}
          invoice={selectedInvoice}
          onSave={refetchAll}
        />
      )}
    </>
  );
};

export default ClientDashboardPage;