'use client';
import { Client, Invoice, Quote, Receipt } from '@ez-billing/types';
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
    const data = await exec<Client[]>(() => callApi('/clients', {}));
    setClients(data ?? []);
  }, [exec]);

  const fetchInvoices = useCallback(async () => {
    const data = await exec<Invoice[]>(() => callApi('/invoices', {}));
    setInvoices(data ?? []);
  }, [exec]);

  const fetchQuotes = useCallback(async () => {
    const data = await exec<Quote[]>(() => callApi('/quotes', {}));
    setQuotes(data ?? []);
  }, [exec]);

  const fetchReceipts = useCallback(async () => {
    const data = await exec<Receipt[]>(() => callApi('/receipts', {}));
    setReceipts(data ?? []);
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
