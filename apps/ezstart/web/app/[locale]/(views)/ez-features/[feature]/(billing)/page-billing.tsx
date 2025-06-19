'use client';
import { H1, Section } from '@ezstart/ui/components';

export const BillingPage = () => {
  return (
    <>
      <Section size={'full'}>
        <H1>EzBilling</H1>
        <p className='text-lg text-muted-foreground'>
          Manage invoices, clients, payments and quotes — all in one place.
        </p>
      </Section>
    </>
  );
};
