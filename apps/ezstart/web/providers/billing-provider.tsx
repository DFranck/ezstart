'use client';
import { Client, Invoice, Quote, Receipt } from '@ezstart/types';
import { useApiAction } from '@ezstart/ui/hooks';
import { callApi } from '@ezstart/ui/utils';
import { useCallback, useEffect, useState } from 'react';
import { BillingContext } from '../contexts/billing-context';
export const BillingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { exec } = useApiAction();

  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    const clients = await exec<Client[]>(() => callApi('/api/clients', {}));
    setClients(clients ?? []);
  }, [exec]);

  const fetchInvoices = useCallback(async () => {
    const invoices = await exec<Invoice[]>(() => callApi('/api/invoices', {}));
    setInvoices(invoices ?? []);
  }, [exec]);

  const fetchQuotes = useCallback(async () => {
    const quotes = await exec<Quote[]>(() => callApi('/api/quotes', {}));
    setQuotes(quotes ?? []);
  }, [exec]);

  const fetchReceipts = useCallback(async () => {
    const receipts = await exec<Receipt[]>(() => callApi('/api/receipts', {}));
    setReceipts(receipts ?? []);
  }, [exec]);

  const refetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchClients(),
      fetchInvoices(),
      fetchQuotes(),
      fetchReceipts(),
    ]);
    setLoading(false);
  }, [fetchClients, fetchInvoices, fetchQuotes, fetchReceipts]);

  useEffect(() => {
    refetchAll();
  }, []);

  return (
    <BillingContext.Provider
      value={{
        clients,
        invoices,
        quotes,
        receipts,
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
