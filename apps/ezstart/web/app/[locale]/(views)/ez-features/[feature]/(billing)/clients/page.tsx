'use client';

<<<<<<< HEAD
import { useBillingContext } from '@/app/[locale]/(views)/ez-features/[feature]/(billing)/contexts/billing-context';
=======
import { useBillingContext } from '@/contexts/billing-context';
>>>>>>> master

const page = () => {
  const { clients } = useBillingContext();
  return <></>;
};

export default page;
