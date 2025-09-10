'use client';

import React, { createContext, useContext, useState } from 'react';

interface Client {
  clientName: string;
  // Add other client properties as needed
}

interface BillingContextType {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <BillingContext.Provider value={{ selectedClient, setSelectedClient }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBillingContext() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBillingContext must be used within a BillingProvider');
  }
  return context;
}