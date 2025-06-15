'use client';
import { useBillingContext } from '@/contexts/billing-context';
import { LayoutWithAside } from '@ezstart/ui/components';
import ClientCard from '../components/client-card';

const page = () => {
  const { clients } = useBillingContext();
  console.log('clients', clients);
  return (
    <LayoutWithAside
      withHeaderOffset
      topHeaderLeftContent={<h1>Dashboard</h1>}
      asideContent={clients.map((c) => (
        <ClientCard key={c._id} client={c} />
      ))}
    >
      lolol
    </LayoutWithAside>
  );
};

export default page;
