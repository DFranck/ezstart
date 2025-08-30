'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { BillingProvider } from '@/providers/billing-provider';
import { ClientModal } from '@/components/client-modal';
import { Button, H1, Header, Icon, Main } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import Link from 'next/link';
import { useState } from 'react';

const LayoutDashboard = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillingProvider>
      <DashboardLayoutWithData>{children}</DashboardLayoutWithData>
    </BillingProvider>
  );
};

const DashboardLayoutWithData = ({ children }: { children: React.ReactNode }) => {
  const { refetchAll } = useBillingContext();
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  return (
    <>
      <Header
        className={cn('h-14 bg-muted border-y sticky top-0')}
        leftContent={
          <H1 size={'h5'} asChild className='text-start w-fit'>
            <Link href='/dashboard'>EzBilling</Link>
          </H1>
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

export default LayoutDashboard;
