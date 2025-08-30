'use client';
import { Client, Invoice, Quote, Receipt, Company } from '@ez-billing/types';
import { callApi } from '@ezstart/ui/utils';
import { useCallback, useEffect, useState } from 'react';
import { BillingContext } from '@/contexts/billing-context';
import { useUserStore } from '@/stores/useUserStore';

export const BillingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUserStore();

  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const refetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [clientsRes, invoicesRes, quotesRes, receiptsRes, companiesRes] = await Promise.all([
        callApi<Client[]>('/clients', {}),
        callApi<Invoice[]>('/invoices', {}),
        callApi<Quote[]>('/quotes', {}),
        callApi<Receipt[]>('/receipts', {}),
        callApi<{companies: Company[]}>(`/companies/user/${user._id}`, {}),
      ]);
      
      if (clientsRes.ok && clientsRes.data) setClients(clientsRes.data);
      if (invoicesRes.ok && invoicesRes.data) setInvoices(invoicesRes.data);
      if (quotesRes.ok && quotesRes.data) setQuotes(quotesRes.data);
      if (receiptsRes.ok && receiptsRes.data) setReceipts(receiptsRes.data);
      if (companiesRes.ok && companiesRes.data) setCompanies(companiesRes.data.companies);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refetchAll();
  }, [user?.username]); // Only depend on username to avoid infinite loops

  return (
    <BillingContext.Provider
      value={{
        clients,
        invoices,
        quotes,
        receipts,
        companies,
        loading,
        refetchAll,
        selectedClient,
        setSelectedClient,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};