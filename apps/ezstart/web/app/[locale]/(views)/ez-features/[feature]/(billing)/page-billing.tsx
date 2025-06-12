'use client';
import { Button, H1, Main, Section } from '@ezstart/ui/components';
import Link from 'next/link';

export const BillingPage = () => {
  return (
    <Main withHeaderOffset>
      <Section>
        <H1>EzBilling</H1>
        <p className='text-lg text-muted-foreground'>
          Manage invoices, clients, payments and quotes — all in one place.
        </p>
      </Section>
      <Button asChild>
        <Link href='billing/dev'>Go to dev</Link>
      </Button>
    </Main>
  );
};
