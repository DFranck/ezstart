'use client';
import { H1, Main, Section } from '@ezstart/ui/components';

export const BillingPage = () => {
  return (
    <Main withHeaderOffset>
      <Section>
        <H1>EzBilling</H1>
        <p className='text-lg text-muted-foreground'>
          Manage invoices, clients, payments and quotes — all in one place.
        </p>
      </Section>
    </Main>
  );
};
