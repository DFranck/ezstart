'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { BillingProvider } from '@/providers/billing-provider';
import { ClientModal } from '@/components/client-modal';
import { Button, H1, H2, Header, Icon, Main } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import Link from 'next/link';
import { useState } from 'react';

const LayoutBilling = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillingProvider>
      <BillingLayoutWithData>{children}</BillingLayoutWithData>
    </BillingProvider>
  );
};

const BillingLayoutWithData = ({ children }: { children: React.ReactNode }) => {
  const { selectedClient, setSelectedClient, refetchAll } = useBillingContext();
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  return (
    <>
      <Header
        className={cn('h-14 bg-muted border-y sticky top-0')}
        leftContent={
          <H1 size={'h5'} asChild className='text-start w-fit'>
            <Link href='/billing'>EzBilling</Link>
          </H1>
        }
        centerContent={
          selectedClient ? (
            <Button onClick={() => setSelectedClient(null)} variant={'ghost'}>
              <H2 size={'h5'}>{selectedClient.clientName}</H2>
            </Button>
          ) : null
        }
        rightContent={
          <Button onClick={() => setIsClientModalOpen(true)}>
            <Icon name='fa:FaPlus' /> New client
          </Button>
        }
      />
      <Main>{children}</Main>
      
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={refetchAll}
      />
    </>
  );
};

export default LayoutBilling;
