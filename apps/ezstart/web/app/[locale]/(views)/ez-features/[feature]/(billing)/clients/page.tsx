'use client';

import { useBillingContext } from '@/app/[locale]/(views)/ez-features/[feature]/(billing)/contexts/billing-context';

const page = () => {
  const { clients } = useBillingContext();
  return <></>;
};

export default page;
