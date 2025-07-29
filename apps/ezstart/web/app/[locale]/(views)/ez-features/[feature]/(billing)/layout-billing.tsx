'use client';

<<<<<<< HEAD
import { useBillingContext } from '@/app/[locale]/(views)/ez-features/[feature]/(billing)/contexts/billing-context';
import { Button, H1, H2, Header, Icon, Main } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import Link from 'next/link';
import { BillingProvider } from './providers/billing-provider';
=======
import { useBillingContext } from '@/contexts/billing-context';
import { BillingProvider } from '@/providers/billing-provider';
import { Button, H1, H2, Header, Icon, Main } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import Link from 'next/link';
>>>>>>> master

export const LayoutBilling = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillingProvider>
      <BillingLayoutWithData>{children}</BillingLayoutWithData>
    </BillingProvider>
  );
};

const BillingLayoutWithData = ({ children }: { children: React.ReactNode }) => {
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
