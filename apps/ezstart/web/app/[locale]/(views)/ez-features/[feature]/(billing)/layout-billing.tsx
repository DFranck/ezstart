'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { BillingProvider } from '@/providers/billing-provider';
import { H1, LayoutWithAside } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import Link from 'next/link';
import ClientCard from './components/client-card';
import NavBilling from './components/nav-billing';

export const LayoutBilling = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillingProvider>
      <BillingLayoutWithData>{children}</BillingLayoutWithData>
    </BillingProvider>
  );
};

const BillingLayoutWithData = ({ children }: { children: React.ReactNode }) => {
  const { clients } = useBillingContext();
  const { isMobile } = useDevice();
  return (
    <LayoutWithAside
      asideAbsoluteOnMobile
      topHeaderLeftContent={
        <H1 size={'h5'} asChild className='text-start'>
          <Link href='/ez-features/ezbilling'>EzBilling</Link>
        </H1>
      }
      topHeaderCenterContent={!isMobile && <NavBilling />}
      mainHeaderRightContent={isMobile && <NavBilling />}
      disableMainHeaderBurger
      asideContent={clients.map((c) => (
        <ClientCard key={c._id} client={c} />
      ))}
    >
      {children}
    </LayoutWithAside>
  );
};
