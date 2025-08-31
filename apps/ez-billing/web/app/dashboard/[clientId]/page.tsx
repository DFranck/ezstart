'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { useUserStore } from '@/stores/useUserStore';
import { InvoiceModal } from '@/components/invoice-modal';
import { QuoteModal } from '@/components/quote-modal';
import { MarkPaidModal } from '@/components/mark-paid-modal';
import { Button, H1, H2, H3, P, Section, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Icon } from '@ezstart/ui/components';
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
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Icon name="lucide:ArrowLeft" className="mr-2 w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6 sm:mb-8 gap-4 sm:gap-6">
          <div className="flex-1">
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                <H1 className="text-2xl sm:text-3xl font-bold text-gray-900">{client?.clientName}</H1>
                <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit">
                  <Icon name={client?.isCompany ? 'lucide:Building2' : 'lucide:User'} className="w-3 h-3 mr-1" />
                  {client?.isCompany ? 'Company' : 'Individual'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {client?.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-gray-400" />
                  <a href={`mailto:${client.email}`} className="hover:text-blue-600 transition-colors">
                    {client.email}
                  </a>
                </div>
              )}
              
              {client?.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Icon name="lucide:Phone" className="w-4 h-4 mr-2 text-gray-400" />
                  <a href={`tel:${client.phone}`} className="hover:text-blue-600 transition-colors">
                    {client.phone}
                  </a>
                </div>
              )}
              
              {client?.address && (
                <div className="flex items-center text-sm text-gray-600">
                  <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{client.city}, {client.country}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button 
              onClick={handleCreateQuote} 
              variant="outline"
              className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md font-medium transition-colors text-sm sm:text-base"
            >
              <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
              New Quote
            </Button>
            <Button 
              onClick={handleCreateInvoice}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-sm text-sm sm:text-base"
            >
              <Icon name="lucide:FileEdit" className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center mb-4">
            <Icon name="lucide:FileEdit" className="w-5 h-5 mr-2 text-blue-600" />
            <H2 className="text-lg sm:text-xl font-semibold text-gray-900">Invoices</H2>
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {clientInvoices.length}
            </span>
          </div>
          {clientInvoices.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
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
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">#{invoice.documentNumber}</TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">
                          {invoice.total} {invoice.currency}
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 min-w-[120px]">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditInvoice(invoice)}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
                            >
                              <Icon name="lucide:Edit" className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            {invoice.status !== 'paid' && (
                              <Button 
                                size="sm"
                                onClick={() => handleMarkPaid(invoice)}
                                className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors whitespace-nowrap"
                              >
                                <Icon name="lucide:CheckCircle" className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Mark Paid</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <Icon name="lucide:FileEdit" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <P className="text-gray-500 mb-2">No invoices yet</P>
              <P className="text-gray-400 text-sm">Create your first invoice to get started</P>
            </div>
          )}
        </div>

        {/* Quotes Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center mb-4">
            <Icon name="lucide:FileText" className="w-5 h-5 mr-2 text-green-600" />
            <H2 className="text-lg sm:text-xl font-semibold text-gray-900">Quotes</H2>
            <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
              {clientQuotes.length}
            </span>
          </div>
          {clientQuotes.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Valid Until</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientQuotes.map((quote) => (
                      <TableRow key={quote._id}>
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">#{quote.documentNumber}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden sm:table-cell">
                          {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditQuote(quote)}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap min-w-[60px]"
                          >
                            <Icon name="lucide:Edit" className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <Icon name="lucide:FileText" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <P className="text-gray-500 mb-2">No quotes yet</P>
              <P className="text-gray-400 text-sm">Create your first quote to get started</P>
            </div>
          )}
        </div>

        {/* Receipts Section */}
        <div>
          <div className="flex items-center mb-4">
            <Icon name="lucide:Receipt" className="w-5 h-5 mr-2 text-purple-600" />
            <H2 className="text-lg sm:text-xl font-semibold text-gray-900">Receipts</H2>
            <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
              {clientReceipts.length}
            </span>
          </div>
          {clientReceipts.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Payment Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientReceipts.map((receipt) => (
                      <TableRow key={receipt._id}>
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium">#{receipt.documentNumber}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            receipt.status === 'refunded' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {receipt.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {receipt.total} {receipt.currency}
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden sm:table-cell">
                          {receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <Icon name="lucide:Receipt" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <P className="text-gray-500 mb-2">No receipts yet</P>
              <P className="text-gray-400 text-sm">Receipts are generated automatically when invoices are paid</P>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
};

export default ClientDashboardPage;