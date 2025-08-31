'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { useUserStore } from '@/stores/useUserStore';
import { InvoiceModal } from '@/components/invoice-modal';
import { QuoteModal } from '@/components/quote-modal';
import { MarkPaidModal } from '@/components/mark-paid-modal';
import { Button, H1, H2, H3, P, Section, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Icon } from '@ezstart/ui/components';
import { Client, Invoice, Quote, Receipt } from '@ez-billing/types';
import { getBillingPermissions } from '@/utils/billing-permissions';
import { useState, useEffect } from 'react';
import { redirect, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const ClientDashboardPage = () => {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  
  const { user } = useUserStore();
  const { clients, invoices, quotes, receipts, companies, refetchAll, loading } = useBillingContext();
  
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

  // Calculate stats
  const totalRevenue = clientInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = clientInvoices
    .filter(inv => inv.status === 'sent')
    .reduce((sum, inv) => sum + inv.total, 0);

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

  const handleConvertToInvoice = (quote: Quote) => {
    const invoiceData = {
      clientId: quote.clientId,
      companyId: quote.companyId,
      items: quote.items,
      currency: quote.currency,
      notes: quote.notes,
      terms: quote.terms,
      taxRate: quote.taxRate,
      status: 'draft' as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    setEditingInvoice(invoiceData as any);
    setIsInvoiceModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-8 h-8 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-full opacity-20 animate-pulse"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading client dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="backdrop-blur-sm bg-white/70 border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium transition-colors mb-4 group"
          >
            <Icon name="lucide:ArrowLeft" className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>

          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            {/* Client Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  client?.isCompany 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}>
                  <Icon 
                    name={client?.isCompany ? "lucide:Building" : "lucide:User"} 
                    className="w-8 h-8 text-white" 
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{client?.clientName}</h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      client?.isCompany 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-cyan-100 text-cyan-700'
                    }`}>
                      <Icon name={client?.isCompany ? 'lucide:Building2' : 'lucide:User'} className="w-3 h-3 mr-1" />
                      {client?.isCompany ? 'Company' : 'Individual'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {client?.email && (
                  <div className="flex items-center text-sm text-gray-600 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                    <Icon name="lucide:Mail" className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`mailto:${client.email}`} className="hover:text-indigo-600 transition-colors">
                      {client.email}
                    </a>
                  </div>
                )}
                
                {client?.phone && (
                  <div className="flex items-center text-sm text-gray-600 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                    <Icon name="lucide:Phone" className="w-4 h-4 mr-2 text-gray-400" />
                    <a href={`tel:${client.phone}`} className="hover:text-indigo-600 transition-colors">
                      {client.phone}
                    </a>
                  </div>
                )}
                
                {client?.address && (
                  <div className="flex items-center text-sm text-gray-600 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                    <Icon name="lucide:MapPin" className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{client.city}, {client.country}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button 
                onClick={handleCreateQuote} 
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
                New Quote
              </Button>
              <Button 
                onClick={handleCreateInvoice}
                className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                <Icon name="lucide:FileEdit" className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center">
                <Icon name="lucide:DollarSign" className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  ${totalRevenue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">Total Revenue</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl flex items-center justify-center">
                <Icon name="lucide:Clock" className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  ${pendingAmount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center">
                <Icon name="lucide:FileEdit" className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{clientInvoices.length}</p>
                <p className="text-sm text-gray-500">Invoices</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                <Icon name="lucide:FileText" className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{clientQuotes.length}</p>
                <p className="text-sm text-gray-500">Quotes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:FileEdit" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
                  <p className="text-sm text-gray-500">{clientInvoices.length} total invoices</p>
                </div>
              </div>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                {clientInvoices.length}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {clientInvoices.length > 0 ? (
              <div className="space-y-4">
                {clientInvoices.map((invoice) => (
                  <div key={invoice._id} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200/60 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center">
                          <Icon name="lucide:FileEdit" className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">#{invoice.documentNumber}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {invoice.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(invoice.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            ${invoice.total} {invoice.currency}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          {(() => {
                            const permissions = getBillingPermissions(invoice, 'invoice');
                            return (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditInvoice(invoice)}
                                  disabled={!permissions.canEdit}
                                  title={!permissions.canEdit ? permissions.reason : undefined}
                                  className="hover:bg-gray-50"
                                >
                                  <Icon name="lucide:Edit" className="w-4 h-4" />
                                </Button>
                                {permissions.canMarkAsPaid && (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleMarkPaid(invoice)}
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                  >
                                    <Icon name="lucide:CheckCircle" className="w-4 h-4 mr-1" />
                                    Mark Paid
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon name="lucide:FileEdit" className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
                <p className="text-gray-500 mb-6">Create your first invoice to get started</p>
                <Button
                  onClick={handleCreateInvoice}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium px-6 py-3 rounded-xl"
                >
                  <Icon name="lucide:FileEdit" className="w-4 h-4 mr-2" />
                  Create First Invoice
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quotes Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:FileText" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Quotes</h2>
                  <p className="text-sm text-gray-500">{clientQuotes.length} total quotes</p>
                </div>
              </div>
              <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                {clientQuotes.length}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {clientQuotes.length > 0 ? (
              <div className="space-y-4">
                {clientQuotes.map((quote) => (
                  <div key={quote._id} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200/60 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center">
                          <Icon name="lucide:FileText" className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">#{quote.documentNumber}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {quote.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(quote.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-sm text-gray-500">
                              Valid until: {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            ${quote.total} {quote.currency}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          {(() => {
                            const permissions = getBillingPermissions(quote, 'quote');
                            return (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditQuote(quote)}
                                  disabled={!permissions.canEdit}
                                  title={!permissions.canEdit ? permissions.reason : undefined}
                                  className="hover:bg-gray-50"
                                >
                                  <Icon name="lucide:Edit" className="w-4 h-4" />
                                </Button>
                                {permissions.canConvertToInvoice && (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleConvertToInvoice(quote)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white"
                                  >
                                    <Icon name="lucide:ArrowRight" className="w-4 h-4 mr-1" />
                                    Invoice
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon name="lucide:FileText" className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotes yet</h3>
                <p className="text-gray-500 mb-6">Create your first quote to get started</p>
                <Button
                  onClick={handleCreateQuote}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium px-6 py-3 rounded-xl"
                >
                  <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
                  Create First Quote
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Receipts Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Icon name="lucide:Receipt" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Receipts</h2>
                  <p className="text-sm text-gray-500">{clientReceipts.length} total receipts</p>
                </div>
              </div>
              <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                {clientReceipts.length}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {clientReceipts.length > 0 ? (
              <div className="space-y-4">
                {clientReceipts.map((receipt) => (
                  <div key={receipt._id} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200/60 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                          <Icon name="lucide:Receipt" className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">#{receipt.documentNumber}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              receipt.status === 'refunded' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {receipt.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              Payment: {receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString() : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ${receipt.total} {receipt.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon name="lucide:Receipt" className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No receipts yet</h3>
                <p className="text-gray-500">Receipts are generated automatically when invoices are paid</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={editingInvoice}
        clients={clients}
        companies={companies}
        onSave={refetchAll}
      />
      
      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        quote={editingQuote}
        clients={clients}
        companies={companies}
        onSave={refetchAll}
      />

      {selectedInvoice && (
        <MarkPaidModal
          isOpen={isMarkPaidModalOpen}
          onClose={() => setIsMarkPaidModalOpen(false)}
          invoice={selectedInvoice}
          companies={companies}
          onSave={refetchAll}
        />
      )}
    </div>
  );
};

export default ClientDashboardPage;