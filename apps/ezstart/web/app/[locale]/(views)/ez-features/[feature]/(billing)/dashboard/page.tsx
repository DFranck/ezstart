'use client';
import { useBillingContext } from '@/contexts/billing-context';
import { LayoutWithAside } from '@ezstart/ui/components';

const page = () => {
  const { clients } = useBillingContext();
  console.log('clients', clients);
  return (
    <LayoutWithAside withHeaderOffset asideContent={<>lalal</>}>
      lolol
    </LayoutWithAside>
  );
};

export default page;
