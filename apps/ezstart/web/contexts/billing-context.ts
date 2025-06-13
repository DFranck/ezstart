'use client';

import { Client, Invoice, Quote, Receipt } from '@ezstart/types';
import { createContext, useContext } from 'react';

type BillingContextType = {
  clients: Client[];
  invoices: Invoice[];
  quotes: Quote[];
  receipts: Receipt[];
  loading: boolean;
  refetchAll: () => Promise<void>;
};

export const BillingContext = createContext<BillingContextType | undefined>(
  undefined
);

export const useBillingContext = () => {
  const context = useContext(BillingContext);
  if (!context)
    throw new Error('useBillingContext must be used within a BillingProvider');
  return context;
};
