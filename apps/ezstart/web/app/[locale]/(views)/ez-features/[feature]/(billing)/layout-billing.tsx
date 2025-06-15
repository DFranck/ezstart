'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { BillingProvider } from '@/providers/billing-provider';
import { LayoutWithAside, LI, Nav, UL } from '@ezstart/ui/components';
import Link from 'next/link';
import ClientCard from './components/client-card';

export const LayoutBilling = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillingProvider>
      <BillingLayoutWithData>{children}</BillingLayoutWithData>
    </BillingProvider>
  );
};

const BillingLayoutWithData = ({ children }: { children: React.ReactNode }) => {
  const { clients } = useBillingContext();

  return (
    <LayoutWithAside
      withHeaderOffset
      topHeaderCenterContent={
        <Nav>
          <UL
            layout={'menu'}
            className='flex-row justify-between'
            size={'default'}
          >
            <LI layout={'menu'} asChild button>
              <Link href='/ez-features/ezbilling/clients'>Clients</Link>
            </LI>
            <LI layout={'menu'} asChild button>
              <Link href='/ez-features/ezbilling/invoices'>Invoices</Link>
            </LI>
            <LI layout={'menu'} asChild button>
              <Link href='/ez-features/ezbilling/quotes'>Quotes</Link>
            </LI>
            <LI layout={'menu'} asChild button>
              <Link href='/ez-features/ezbilling/receipts'>Receipts</Link>
            </LI>
          </UL>
        </Nav>
      }
      asideContent={clients.map((c) => (
        <ClientCard key={c._id} client={c} />
      ))}
    >
      {children}
    </LayoutWithAside>
  );
};
