'use client';

import { useBillingContext } from '@/app/[locale]/(views)/ez-features/[feature]/(billing)/contexts/billing-context';
import { Button, H1, H2, Header, Icon, Main } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import Link from 'next/link';

export const LayoutAuth = ({ children }: { children: React.ReactNode }) => {
  return (
    // <BillingProvider>
    <>{children}</>
    // </BillingProvider>
  );
};

const AuthLayoutWithData = ({ children }: { children: React.ReactNode }) => {
  const { selectedClient, setSelectedClient } = useBillingContext();
  return (
    <>
      <Header
        className={cn('h-14 bg-muted border-y sticky top-0')}
        leftContent={
          <H1 size={'h5'} asChild className='text-start w-fit'>
            <Link href='/ez-features/ez-billing'>EzBilling</Link>
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
          <Button>
            <Icon name='fa:FaPlus' /> New client
          </Button>
        }
      />
      <Main>{children}</Main>
    </>
  );
};
