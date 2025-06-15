'use client';
import { useBillingContext } from '@/contexts/billing-context';
import { LayoutWithAside, Nav } from '@ezstart/ui/components';
import ClientCard from '../components/client-card';

const page = () => {
  const { clients } = useBillingContext();
  console.log('clients', clients);
  return (
    <LayoutWithAside
      withHeaderOffset
      topHeaderCenterContent={<Nav>client, invoices,quote,receipt</Nav>}
      asideContent={clients.map((c) => (
        <ClientCard key={c._id} client={c} />
      ))}
    >
      lolol
    </LayoutWithAside>
  );
};

export default page;
