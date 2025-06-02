'use client';
import { H1, Main, Section } from '@ezstart/ui/components';
import { Dashboard } from './(dev)/dashboard';

export const BillingPage = () => {
  return (
    <Main padding>
      <Section>
        <H1>EzBilling</H1>
        <p className='text-lg text-muted-foreground'>
          Manage invoices, clients, payments and quotes — all in one place.
        </p>
      </Section>
      <Dashboard />
    </Main>
  );
};
